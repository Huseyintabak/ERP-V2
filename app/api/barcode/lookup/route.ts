import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyJWT } from "@/lib/auth/jwt";
import { logger } from "@/lib/utils/logger";

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get("thunder_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get("barcode");

    if (!barcode) {
      return NextResponse.json(
        { error: "Barcode parameter is required" },
        { status: 400 }
      );
    }

    console.log('🔍 Barcode lookup started for:', barcode);

    // Use admin client to bypass RLS
    const supabase = await createAdminClient();

    // Search in all three tables: raw_materials, semi_finished_products, finished_products
    console.log('📊 Searching in all three tables...');
    const [rawResult, semiResult, finishedResult] = await Promise.all([
      // Raw Materials
      supabase
        .from("raw_materials")
        .select("id, code, name, barcode, quantity, unit, critical_level, created_at")
        .or(`barcode.eq.${barcode},code.eq.${barcode}`)
        .limit(1),

      // Semi Finished Products
      supabase
        .from("semi_finished_products")
        .select("id, code, name, barcode, quantity, unit, critical_level, created_at")
        .or(`barcode.eq.${barcode},code.eq.${barcode}`)
        .limit(1),

      // Finished Products
      supabase
        .from("finished_products")
        .select("id, code, name, barcode, quantity, critical_level, created_at")
        .or(`barcode.eq.${barcode},code.eq.${barcode}`)
        .limit(1),
    ]);

    // Check for errors
    if (rawResult.error || semiResult.error || finishedResult.error) {
      logger.error("Barcode lookup error:", {
        raw: rawResult.error,
        semi: semiResult.error,
        finished: finishedResult.error,
      });
      return NextResponse.json(
        { error: "Database query failed" },
        { status: 500 }
      );
    }

    console.log('📦 Search results:', {
      raw: rawResult.data?.length || 0,
      semi: semiResult.data?.length || 0,
      finished: finishedResult.data?.length || 0,
    });

    // Find the product
    let product = null;
    let materialType = null;

    if (rawResult.data && rawResult.data.length > 0) {
      product = rawResult.data[0];
      materialType = "raw";
      console.log('✅ Found in raw_materials:', product);
    } else if (semiResult.data && semiResult.data.length > 0) {
      product = semiResult.data[0];
      materialType = "semi";
      console.log('✅ Found in semi_finished_products:', product);
    } else if (finishedResult.data && finishedResult.data.length > 0) {
      product = finishedResult.data[0];
      materialType = "finished";
      console.log('✅ Found in finished_products:', product);
    }

    if (!product) {
      console.log('❌ Product not found in any table for barcode:', barcode);
      return NextResponse.json(
        {
          found: false,
          message: "Barkod bulunamadı",
          barcode,
        },
        { status: 404 }
      );
    }

    // Get stock movements for this product
    const { data: movements } = await supabase
      .from("stock_movements")
      .select("movement_type, quantity, created_at, description")
      .eq("material_type", materialType)
      .eq("material_id", product.id)
      .order("created_at", { ascending: false })
      .limit(5);

    // Get zone inventory if finished product
    let zoneInventory = null;
    if (materialType === "finished") {
      // Get zone inventories from zone_inventories table
      const { data: zones } = await supabase
        .from("zone_inventories")
        .select(
          `
          quantity,
          zone:warehouse_zones(id, name, zone_type)
        `
        )
        .eq("material_type", "finished")
        .eq("material_id", product.id);

      zoneInventory = zones || [];

      // Also get center zone inventory from finished_products table
      // Find the center zone
      const { data: centerZone } = await supabase
        .from("warehouse_zones")
        .select("id, name, zone_type")
        .eq("zone_type", "center")
        .limit(1)
        .single();

      if (centerZone && product.quantity > 0) {
        // Add center zone to inventory list
        zoneInventory.unshift({
          quantity: product.quantity,
          zone: centerZone,
        });
      }
    }

    return NextResponse.json({
      found: true,
      product: {
        ...product,
        material_type: materialType,
        material_type_label:
          materialType === "raw"
            ? "Hammadde"
            : materialType === "semi"
            ? "Yarı Mamul"
            : "Nihai Ürün",
      },
      recentMovements: movements || [],
      zoneInventory: zoneInventory || [],
      barcode,
    });
  } catch (error) {
    logger.error("Barcode lookup API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
