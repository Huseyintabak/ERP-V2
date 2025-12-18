-- ═══════════════════════════════════════════════════════════
-- 🎯 FINAL MIGRATION VALIDATION
-- ═══════════════════════════════════════════════════════════
-- Bu script tüm migration özelliklerini kontrol eder
-- ═══════════════════════════════════════════════════════════

DO $$
DECLARE
    v_bom_snapshot_count INT;
    v_stock_movements_count INT;
    v_production_log_id_exists BOOLEAN;
    v_target_roles_exists BOOLEAN;
    v_notification_count INT;
    v_produced_quantity NUMERIC;
    v_trigger_exists BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '        FINAL MIGRATION VALIDATION REPORT';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';

    -- ═══════════════════════════════════════════════════════════
    -- CHECK 1: BOM Snapshot Creation
    -- ═══════════════════════════════════════════════════════════
    RAISE NOTICE '1️⃣  BOM SNAPSHOT KONTROLU';
    RAISE NOTICE '-----------------------------------------------------------';
    
    SELECT COUNT(*) INTO v_bom_snapshot_count
    FROM production_plan_bom_snapshot;
    
    IF v_bom_snapshot_count >= 2 THEN
        RAISE NOTICE '✅ BOM Snapshot: % kayit bulundu - BASARILI!', v_bom_snapshot_count;
    ELSE
        RAISE NOTICE '❌ BOM Snapshot: Sadece % kayit - YETERSIZ!', v_bom_snapshot_count;
    END IF;
    RAISE NOTICE '';

    -- ═══════════════════════════════════════════════════════════
    -- CHECK 2: Material Consumption Trigger
    -- ═══════════════════════════════════════════════════════════
    RAISE NOTICE '2️⃣  MATERIAL CONSUMPTION TRIGGER KONTROLU';
    RAISE NOTICE '-----------------------------------------------------------';
    
    SELECT COUNT(*) INTO v_stock_movements_count
    FROM stock_movements
    WHERE production_log_id IS NOT NULL;
    
    IF v_stock_movements_count >= 2 THEN
        RAISE NOTICE '✅ Stock Movements: % kayit - Trigger CALISIYOR!', v_stock_movements_count;
    ELSE
        RAISE NOTICE '❌ Stock Movements: % kayit - Trigger HATALI!', v_stock_movements_count;
    END IF;
    RAISE NOTICE '';

    -- ═══════════════════════════════════════════════════════════
    -- CHECK 3: production_log_id Column
    -- ═══════════════════════════════════════════════════════════
    RAISE NOTICE '3️⃣  PRODUCTION_LOG_ID KOLONU KONTROLU';
    RAISE NOTICE '-----------------------------------------------------------';
    
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'stock_movements' 
        AND column_name = 'production_log_id'
    ) INTO v_production_log_id_exists;
    
    IF v_production_log_id_exists THEN
        RAISE NOTICE '✅ production_log_id kolonu MEVCUT!';
    ELSE
        RAISE NOTICE '❌ production_log_id kolonu EKSIK!';
    END IF;
    RAISE NOTICE '';

    -- ═══════════════════════════════════════════════════════════
    -- CHECK 4: target_roles Column
    -- ═══════════════════════════════════════════════════════════
    RAISE NOTICE '4️⃣  TARGET_ROLES KOLONU KONTROLU';
    RAISE NOTICE '-----------------------------------------------------------';
    
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'target_roles'
    ) INTO v_target_roles_exists;
    
    IF v_target_roles_exists THEN
        RAISE NOTICE '✅ target_roles kolonu MEVCUT!';
    ELSE
        RAISE NOTICE '❌ target_roles kolonu EKSIK!';
    END IF;
    RAISE NOTICE '';

    -- ═══════════════════════════════════════════════════════════
    -- CHECK 5: Critical Stock Notifications
    -- ═══════════════════════════════════════════════════════════
    RAISE NOTICE '5️⃣  CRITICAL STOCK NOTIFICATION KONTROLU';
    RAISE NOTICE '-----------------------------------------------------------';
    
    SELECT COUNT(*) INTO v_notification_count
    FROM notifications
    WHERE type = 'critical_stock'
    AND target_roles IS NOT NULL
    AND 'planlama' = ANY(target_roles)
    AND 'yonetici' = ANY(target_roles);
    
    IF v_notification_count > 0 THEN
        RAISE NOTICE '✅ Critical Stock Notification: % bildirim bulundu!', v_notification_count;
        RAISE NOTICE '✅ target_roles: {planlama, yonetici} DOGRU!';
    ELSE
        RAISE NOTICE '❌ Critical Stock Notification: Bildirim bulunamadi!';
    END IF;
    RAISE NOTICE '';

    -- ═══════════════════════════════════════════════════════════
    -- CHECK 6: Produced Quantity Trigger
    -- ═══════════════════════════════════════════════════════════
    RAISE NOTICE '6️⃣  PRODUCED_QUANTITY UPDATE TRIGGER KONTROLU';
    RAISE NOTICE '-----------------------------------------------------------';
    
    -- Trigger var mı kontrol et
    SELECT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'trigger_production_log_stock'
    ) INTO v_trigger_exists;
    
    IF v_trigger_exists THEN
        RAISE NOTICE '✅ trigger_production_log_stock MEVCUT!';
    ELSE
        RAISE NOTICE '❌ trigger_production_log_stock EKSIK!';
    END IF;
    
    -- Produced quantity güncel mi kontrol et
    SELECT produced_quantity INTO v_produced_quantity
    FROM production_plans
    WHERE id = 'fde92447-21c4-4c3a-9a0a-785ff775fd8d';
    
    IF v_produced_quantity = 1 THEN
        RAISE NOTICE '✅ produced_quantity: % - GUNCEL!', v_produced_quantity;
    ELSE
        RAISE NOTICE '⚠️  produced_quantity: % - Beklenen: 1', v_produced_quantity;
    END IF;
    RAISE NOTICE '';

    -- ═══════════════════════════════════════════════════════════
    -- FINAL SUMMARY
    -- ═══════════════════════════════════════════════════════════
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '                 FINAL SUMMARY';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    
    IF v_bom_snapshot_count >= 2 
       AND v_stock_movements_count >= 2 
       AND v_production_log_id_exists 
       AND v_target_roles_exists 
       AND v_notification_count > 0 
       AND v_trigger_exists
       AND v_produced_quantity = 1 THEN
        RAISE NOTICE '';
        RAISE NOTICE '🎉🎉🎉 MIGRATION BASARIYLA TAMAMLANDI! 🎉🎉🎉';
        RAISE NOTICE '';
        RAISE NOTICE '✅ BOM Snapshot Trigger';
        RAISE NOTICE '✅ Material Consumption Trigger';
        RAISE NOTICE '✅ Critical Stock Notification';
        RAISE NOTICE '✅ production_log_id Kolonu';
        RAISE NOTICE '✅ target_roles Kolonu';
        RAISE NOTICE '✅ produced_quantity Trigger';
        RAISE NOTICE '';
        RAISE NOTICE '🚀 SISTEM PRODUCTION READY!';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  BAZI TESTLER BASARISIZ!';
        RAISE NOTICE '';
        IF v_bom_snapshot_count < 2 THEN
            RAISE NOTICE '❌ BOM Snapshot';
        END IF;
        IF v_stock_movements_count < 2 THEN
            RAISE NOTICE '❌ Material Consumption';
        END IF;
        IF NOT v_production_log_id_exists THEN
            RAISE NOTICE '❌ production_log_id kolonu';
        END IF;
        IF NOT v_target_roles_exists THEN
            RAISE NOTICE '❌ target_roles kolonu';
        END IF;
        IF v_notification_count = 0 THEN
            RAISE NOTICE '❌ Critical Stock Notification';
        END IF;
        IF NOT v_trigger_exists THEN
            RAISE NOTICE '❌ produced_quantity trigger';
        END IF;
        RAISE NOTICE '';
    END IF;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    
END $$;

-- Detaylı Rapor
SELECT 
    '📊 MIGRATION RAPORU' as report_title,
    (SELECT COUNT(*) FROM production_plan_bom_snapshot) as bom_snapshots,
    (SELECT COUNT(*) FROM stock_movements WHERE production_log_id IS NOT NULL) as stock_movements_with_log,
    (SELECT COUNT(*) FROM notifications WHERE type = 'critical_stock') as critical_notifications,
    (SELECT produced_quantity FROM production_plans WHERE id = 'fde92447-21c4-4c3a-9a0a-785ff775fd8d') as current_produced_qty,
    (SELECT COUNT(*) FROM production_logs WHERE plan_id = 'fde92447-21c4-4c3a-9a0a-785ff775fd8d') as production_logs;
