-- production_plan_bom_snapshot kısıtları (2026-11-21, VPS'te uygulandı)
--
-- Sipariş onayı ve create_bom_snapshot trigger'ı aynı snapshot'ı iki kez yazıyordu → üretimde
-- hammaddeler iki kat tüketiliyordu (kod tarafı 1b348ed'de düzeltildi). Unique kısıt bunun tekrarını
-- DB seviyesinde engeller. FK yoktu: plan silinince snapshot yetim kalıyordu (5898 yetim satır vardı).

begin;

delete from public.production_plan_bom_snapshot s
where not exists (select 1 from public.production_plans p where p.id = s.plan_id);

alter table public.production_plan_bom_snapshot
  add constraint production_plan_bom_snapshot_plan_material_key unique (plan_id, material_type, material_id);

alter table public.production_plan_bom_snapshot
  add constraint production_plan_bom_snapshot_plan_id_fkey
  foreign key (plan_id) references public.production_plans(id) on delete cascade;

commit;
