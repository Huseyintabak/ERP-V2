import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyJWT } from "@/lib/auth/jwt";

import { logger } from "@/lib/utils/logger";
// Support both POST and PATCH for flexibility
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleApprove(request, await params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleApprove(request, await params);
}

async function handleApprove(request: NextRequest, params: { id: string }) {
  try {
    logger.log("🚀 Order approval endpoint called");
    const token = request.cookies.get("thunder_token")?.value;
    if (!token) {
      logger.warn("❌ No token found in request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    const { id } = params;
    logger.log(
      `📦 Approving order: ${id}, User: ${payload.userId}, Role: ${payload.role}`,
    );
    const supabase = await createClient();

    // Allow both managers and planning personnel to approve orders
    if (!["yonetici", "planlama"].includes(payload.role)) {
      logger.warn(
        `❌ Forbidden: Role ${payload.role} is not allowed to approve orders`,
      );
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // No need for status in request body - approval always sets status to 'uretimde'
    const body = await request.json().catch(() => ({}));
    const notes = body.notes;

    // Approval always sets status to 'uretimde' (in production)
    const status = "uretimde";

    // First, check stock availability before approving the order
    logger.log("🔍 Checking stock availability before approval...");

    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select(
        `
        *,
        product:finished_products(id, code, name)
      `,
      )
      .eq("order_id", id);

    if (itemsError) {
      logger.error("❌ Error fetching order items:", itemsError);
      return NextResponse.json(
        {
          error: "Failed to fetch order items",
          details: itemsError.message,
        },
        { status: 400 },
      );
    }

    if (!orderItems || orderItems.length === 0) {
      logger.warn("⚠️ No order items found in order!");
      return NextResponse.json(
        { error: "Siparişte ürün bulunamadı" },
        { status: 400 },
      );
    }

    // OPTIMIZATION: Batch fetch all BOMs for all products at once
    logger.log("🔍 Batch fetching BOMs for all products...");
    const productIds = orderItems.map((item) => item.product_id);

    const { data: allBomItems, error: bomError } = await supabase
      .from("bom")
      .select(
        "finished_product_id, material_type, material_id, quantity_needed",
      )
      .in("finished_product_id", productIds);

    if (bomError) {
      logger.error("❌ Error fetching BOMs:", bomError);
      return NextResponse.json(
        {
          error: "Failed to fetch BOMs",
          details: bomError.message,
        },
        { status: 400 },
      );
    }

    // Group BOM items by product
    const bomByProduct = new Map();
    (allBomItems || []).forEach((bom) => {
      if (!bomByProduct.has(bom.finished_product_id)) {
        bomByProduct.set(bom.finished_product_id, []);
      }
      bomByProduct.get(bom.finished_product_id).push(bom);
    });

    // OPTIMIZATION: Collect all unique material IDs and batch fetch
    const rawMaterialIds = new Set();
    const semiFinishedIds = new Set();

    (allBomItems || []).forEach((bom) => {
      if (bom.material_type === "raw") {
        rawMaterialIds.add(bom.material_id);
      } else {
        semiFinishedIds.add(bom.material_id);
      }
    });

    // Batch fetch all materials in parallel
    logger.log(
      `🔍 Batch fetching ${rawMaterialIds.size} raw materials and ${semiFinishedIds.size} semi-finished products...`,
    );

    const [rawMaterialsResult, semiFinishedResult] = await Promise.all([
      rawMaterialIds.size > 0
        ? supabase
            .from("raw_materials")
            .select("id, code, name, quantity, reserved_quantity")
            .in("id", Array.from(rawMaterialIds))
        : Promise.resolve({ data: [], error: null }),
      semiFinishedIds.size > 0
        ? supabase
            .from("semi_finished_products")
            .select("id, code, name, quantity, reserved_quantity")
            .in("id", Array.from(semiFinishedIds))
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (rawMaterialsResult.error) {
      logger.error(
        "❌ Error fetching raw materials:",
        rawMaterialsResult.error,
      );
      return NextResponse.json(
        {
          error: "Failed to fetch raw materials",
          details: rawMaterialsResult.error.message,
        },
        { status: 400 },
      );
    }

    if (semiFinishedResult.error) {
      logger.error(
        "❌ Error fetching semi-finished products:",
        semiFinishedResult.error,
      );
      return NextResponse.json(
        {
          error: "Failed to fetch semi-finished products",
          details: semiFinishedResult.error.message,
        },
        { status: 400 },
      );
    }

    // Create material lookup map
    const materialMap = new Map();
    (rawMaterialsResult.data || []).forEach((m) => materialMap.set(m.id, m));
    (semiFinishedResult.data || []).forEach((m) => materialMap.set(m.id, m));

    // Check stock availability for all items (now using cached data)
    const insufficientMaterials = [];

    for (const item of orderItems) {
      const productName = (item.product as any)?.name || "Bilinmeyen Ürün";
      const bomItems = bomByProduct.get(item.product_id) || [];

      logger.log(
        `🔍 Checking stock for: ${productName} (${item.quantity} units, ${bomItems.length} BOM items)`,
      );

      for (const bomItem of bomItems) {
        const needed = bomItem.quantity_needed * item.quantity;
        const material = materialMap.get(bomItem.material_id);

        if (!material) {
          logger.warn(`⚠️ Material not found: ${bomItem.material_id}`);
          continue;
        }

        const available = material.quantity - material.reserved_quantity;

        if (available < needed) {
          insufficientMaterials.push({
            product_id: item.product_id,
            product_name: productName,
            material_code: material.code,
            material_name: material.name,
            needed: needed,
            available: available,
            shortfall: needed - available,
          });
          logger.warn(
            `⚠️ Insufficient stock for ${material.code}: needed ${needed}, available ${available}`,
          );
        }
      }
    }

    // If there are insufficient materials, don't approve the order
    if (insufficientMaterials.length > 0) {
      const errorMessage =
        `❌ Sipariş onaylanamadı! Stok yetersizliği nedeniyle üretim yapılamıyor.\n\n🔍 Eksik Stoklar:\n\n` +
        insufficientMaterials
          .map(
            (item) =>
              `• ${item.product_name} için ${item.material_name} (${item.material_code}):\n` +
              `  - Gerekli: ${item.needed} adet\n` +
              `  - Mevcut: ${item.available} adet\n` +
              `  - Eksik: ${item.shortfall} adet`,
          )
          .join("\n\n") +
        `\n\n💡 Bu malzemelerin stokları artırıldıktan sonra siparişi tekrar onaylayabilirsiniz.`;

      return NextResponse.json(
        {
          error: errorMessage,
          insufficient_materials: insufficientMaterials,
        },
        { status: 400 },
      );
    }

    // If stock is sufficient, proceed with approval
    logger.log("✅ Stock check passed, proceeding with approval...");

    // Update order status
    logger.log("🔍 Updating order:", id, "to status:", status);
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (orderError) {
      logger.error("❌ Order update error:", orderError);
      logger.error("Error details:", JSON.stringify(orderError, null, 2));
      return NextResponse.json(
        {
          error: "Failed to update order status",
          details: orderError.message,
          code: orderError.code,
        },
        { status: 400 },
      );
    }

    logger.log("✅ Order updated successfully:", order.order_number);

    // If status is 'uretimde' (approved), create production plans and reserve materials
    if (status === "uretimde") {
      logger.log("🏭 Starting order approval for order:", id);

      // Get order details including assigned operator
      const { data: orderDetails, error: orderDetailsError } = await supabase
        .from("orders")
        .select("assigned_operator_id")
        .eq("id", id)
        .single();

      if (orderDetailsError) {
        logger.error("❌ Error fetching order details:", orderDetailsError);
        return NextResponse.json(
          {
            error: "Failed to fetch order details",
            details: orderDetailsError.message,
          },
          { status: 400 },
        );
      }

      logger.log(
        "👤 Order assigned operator:",
        orderDetails.assigned_operator_id,
      );

      // Fetch order items with product details
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select(
          `
          *,
          product:finished_products(id, code, name)
        `,
        )
        .eq("order_id", id);

      if (itemsError) {
        logger.error("❌ Error fetching order items:", itemsError);
        return NextResponse.json(
          {
            error: "Failed to fetch order items",
            details: itemsError.message,
          },
          { status: 400 },
        );
      }

      logger.log("📦 Order items:", JSON.stringify(orderItems, null, 2));

      if (orderItems && orderItems.length > 0) {
        // Group items by product_id to avoid duplicate production plans
        const productGroups = new Map();

        for (const item of orderItems) {
          const productId = item.product_id;
          const productName = (item.product as any)?.name || "N/A";
          if (productGroups.has(productId)) {
            // If same product exists, add quantities together
            productGroups.get(productId).quantity += item.quantity;
            logger.log(
              `🔄 Merging duplicate product ${productId}: ${item.quantity} added to existing ${productGroups.get(productId).quantity - item.quantity}`,
            );
          } else {
            // New product
            productGroups.set(productId, {
              product_id: productId,
              quantity: item.quantity,
              product_name: productName,
            });
            logger.log(`🆕 New product ${productId}: ${item.quantity} units`);
          }
        }

        logger.log(
          `📊 Grouped ${orderItems.length} items into ${productGroups.size} unique products`,
        );

        // DEBUG: Tüm ürünleri logla
        logger.log("📦 All products to create plans for:");
        productGroups.forEach((productData, productId) => {
          logger.log(
            `  - Product ${productId}: ${productData.quantity} units (${productData.product_name || "N/A"})`,
          );
        });

        let createdPlansCount = 0;
        let skippedPlansCount = 0;
        let errorPlansCount = 0;

        // Create production plans for each unique product
        for (const [productId, productData] of productGroups) {
          logger.log(
            "🏭 Processing product:",
            productId,
            "total quantity:",
            productData.quantity,
          );

          // Check if production plan already exists for this order and product
          const { data: existingPlan } = await supabase
            .from("production_plans")
            .select("id, status")
            .eq("order_id", id)
            .eq("product_id", productId)
            .single();

          if (existingPlan) {
            logger.log(
              "⚠️ Production plan already exists for this order and product. Skipping...",
            );
            logger.log(
              "   Plan ID:",
              existingPlan.id,
              "Status:",
              existingPlan.status,
            );
            skippedPlansCount++;
            continue; // Skip creating duplicate plan
          }

          // Create production plan with operator assignment if available
          const planData: any = {
            order_id: id,
            product_id: productId,
            planned_quantity: productData.quantity,
            produced_quantity: 0,
            status: "planlandi",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // If order has assigned operator, assign to production plan
          if (orderDetails.assigned_operator_id) {
            planData.assigned_operator_id = orderDetails.assigned_operator_id;
            logger.log(
              "👤 Assigning operator to production plan:",
              orderDetails.assigned_operator_id,
            );
          } else {
            logger.warn(
              "⚠️ Order has no assigned operator - plan will be created without operator assignment",
            );
          }

          const { data: plan, error: planError } = await supabase
            .from("production_plans")
            .insert(planData)
            .select()
            .single();

          if (planError) {
            logger.error("❌ Error creating production plan:", planError);
            logger.error("   Plan data:", JSON.stringify(planData, null, 2));
            errorPlansCount++;
            continue;
          }

          createdPlansCount++;
          logger.log(
            `✅ Production plan created: ${plan.id} for product ${productId} (${productData.product_name || "N/A"})`,
          );
          logger.log(
            `   Assigned operator: ${plan.assigned_operator_id || "NONE"}`,
          );

          // OPTIMIZATION: Reuse BOM data already fetched earlier
          const bomItems = bomByProduct.get(productId) || [];

          if (bomItems.length === 0) {
            logger.warn(`⚠️ No BOM items found for product ${productId}`);
            continue;
          }

          logger.log("🔧 BOM items:", bomItems.length);

          // OPTIMIZATION: Batch create BOM snapshots
          logger.log("📸 Creating BOM snapshots for plan:", plan.id);

          const snapshotRecords = bomItems
            .map((bomItem: any) => {
              const material = materialMap.get(bomItem.material_id);
              if (!material) {
                logger.warn(
                  `⚠️ Material not found for snapshot: ${bomItem.material_id}`,
                );
                return null;
              }

              return {
                plan_id: plan.id,
                material_type: bomItem.material_type,
                material_id: bomItem.material_id,
                material_code: material.code,
                material_name: material.name,
                quantity_needed: bomItem.quantity_needed,
              };
            })
            .filter((record: any) => record !== null);

          if (snapshotRecords.length > 0) {
            const { error: snapshotError } = await supabase
              .from("production_plan_bom_snapshot")
              .insert(snapshotRecords);

            if (snapshotError) {
              logger.error("❌ Error creating BOM snapshots:", snapshotError);
            } else {
              logger.log(`✅ Created ${snapshotRecords.length} BOM snapshots`);
            }
          }

          // OPTIMIZATION: Batch reserve materials
          logger.log("🔒 Reserving materials for plan:", plan.id);

          // Group updates by table
          const rawUpdates = [];
          const semiUpdates = [];
          const reservationRecords = [];

          for (const bomItem of bomItems) {
            const needed = bomItem.quantity_needed * productData.quantity;
            const material = materialMap.get(bomItem.material_id);

            if (!material) {
              logger.warn(
                `⚠️ Material not found for reservation: ${bomItem.material_id}`,
              );
              continue;
            }

            // Prepare update data
            const updateData = {
              id: bomItem.material_id,
              reserved_quantity: material.reserved_quantity + needed,
            };

            if (bomItem.material_type === "raw") {
              rawUpdates.push(updateData);
            } else {
              semiUpdates.push(updateData);
            }

            // Prepare reservation record
            reservationRecords.push({
              order_id: id,
              order_type: "production_order",
              material_type: bomItem.material_type,
              material_id: bomItem.material_id,
              reserved_quantity: needed,
              consumed_quantity: 0,
              status: "active",
            });

            // Update in-memory cache for next iteration
            material.reserved_quantity += needed;
          }

          // Execute batch updates in parallel
          const updatePromises = [];

          for (const update of rawUpdates) {
            updatePromises.push(
              supabase
                .from("raw_materials")
                .update({
                  reserved_quantity: update.reserved_quantity,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", update.id),
            );
          }

          for (const update of semiUpdates) {
            updatePromises.push(
              supabase
                .from("semi_finished_products")
                .update({
                  reserved_quantity: update.reserved_quantity,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", update.id),
            );
          }

          const updateResults = await Promise.allSettled(updatePromises);
          const failedUpdates = updateResults.filter(
            (r) => r.status === "rejected",
          );

          if (failedUpdates.length > 0) {
            logger.error(`❌ ${failedUpdates.length} material updates failed`);
          } else {
            logger.log(
              `✅ Updated ${updateResults.length} material reservations`,
            );
          }

          // Batch insert reservation records
          if (reservationRecords.length > 0) {
            const { error: reservationError } = await supabase
              .from("material_reservations")
              .insert(reservationRecords);

            if (reservationError) {
              logger.error(
                "❌ Error creating material reservation records:",
                reservationError,
              );
            } else {
              logger.log(
                `✅ Created ${reservationRecords.length} material_reservations records`,
              );
            }
          }
        }

        // Summary log
        logger.log(`📊 Production Plan Creation Summary:`);
        logger.log(`   Total products: ${productGroups.size}`);
        logger.log(`   Created: ${createdPlansCount}`);
        logger.log(`   Skipped (existing): ${skippedPlansCount}`);
        logger.log(`   Errors: ${errorPlansCount}`);
      } else {
        logger.warn("⚠️ No order items found in order!");
      }

      logger.log("✅ Order approved successfully with BOM reservations");
    }

    return NextResponse.json(order);
  } catch (error) {
    logger.error("Error updating order status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
