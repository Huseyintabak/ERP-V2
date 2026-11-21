-- Mükerrer trigger temizliği (2026-11-21, VPS'te uygulandı)
--
-- Her stok güncellemesinde kritik stok kontrolü 3 kez çalışıyordu:
--  - check_critical_stock aynı tabloya iki ayrı isimle bağlıydı (check_critical_* ve trigger_*_critical_stock)
--  - check_critical_stock_raw/_semi/_finished ayrıca material_id'siz ikinci bir bildirim yazıyordu
-- production_logs silinince log_rollback_history hem BEFORE hem AFTER çalışıyor → 2 audit kaydı.
--
-- Sonuç: bildirimi tek fonksiyon (check_critical_stock: tekrar yazmaz, stok düzelince kapatır) yazar;
-- _raw/_finished sadece satın alma talebi açar (satinalma/kritik-stoklar sayfası kullanıyor).

begin;

drop trigger if exists check_critical_raw on public.raw_materials;
drop trigger if exists check_critical_semi on public.semi_finished_products;
drop trigger if exists trg_check_critical_stock_semi on public.semi_finished_products;
drop function if exists public.check_critical_stock_semi();

drop trigger if exists production_log_rollback_trigger on public.production_logs;

create or replace function public.check_critical_stock_raw()
returns trigger language plpgsql as $$
begin
  if new.quantity <= new.critical_level and old.quantity > new.critical_level then
    if not exists (select 1 from purchase_requests
                   where material_type = 'raw' and material_id = new.id and status = 'beklemede') then
      insert into purchase_requests (material_type, material_id, requested_quantity, status)
      values ('raw', new.id, new.critical_level * 2, 'beklemede');
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.check_critical_stock_finished()
returns trigger language plpgsql as $$
begin
  if new.quantity <= new.critical_level and old.quantity > new.critical_level then
    if not exists (select 1 from purchase_requests
                   where material_type = 'finished' and material_id = new.id and status = 'beklemede') then
      insert into purchase_requests (material_type, material_id, requested_quantity, status)
      values ('finished', new.id, new.critical_level * 2, 'beklemede');
    end if;
  end if;
  return new;
end;
$$;

commit;
