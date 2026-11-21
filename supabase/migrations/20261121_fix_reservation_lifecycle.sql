-- Rezervasyon yaşam döngüsü düzeltmesi (2026-11-21)
--
-- Sorunlar:
--  1) Sipariş onayı rezervasyonları order_type='production_order' ile yazıyor; tüketim/tamamlama
--     trigger'ları 'production_plan' arıyordu → rezervasyon kayıtları hiç güncellenmiyordu.
--  2) cancel_production_plan / cancel_order_with_plans, release_reservations_on_plan_cancel(uuid)
--     çağırıyordu ama fonksiyon sadece NOTICE basan bir taslaktı → iptalde rezerve stok
--     (reserved_quantity) sonsuza kadar kilitli kalıyordu.
--  3) cleanup_reservations_on_plan_complete kalan rezervasyonu stoğa EKLİYORDU (quantity + x);
--     rezervasyon stoğu düşürmediği için bu stok şişirirdi (tür uyuşmazlığı yüzünden çalışmıyordu).
--  4) update_reservations_on_production (trigger_sync_reservations_on_production) farklı bir formülle
--     (quantity_needed / planned_quantity) aynı işi tekrar yapmaya çalışıyordu; `record IS NOT NULL`
--     kontrolü yüzünden hiç çalışmıyordu, çalışsaydı rezerveyi ikinci kez düşürürdü.
--
-- Model:
--  - Onay: malzeme.reserved_quantity += BOM × adet; material_reservations satırı (active).
--  - Üretim kaydı: stok ve reserved_quantity tüketim kadar düşer; rezervasyon satırının
--    consumed_quantity'si artar (tamamen tüketilince 'completed').
--  - İptal / tamamlama: planın üretilmemiş kısmı (BOM × (planlanan − üretilen)) kadar
--    reserved_quantity serbest bırakılır. Gerçek stoğa (quantity) ASLA ekleme yapılmaz.

begin;

-- (4) gereksiz ve çelişkili trigger
drop trigger if exists trigger_sync_reservations_on_production on public.production_logs;
drop function if exists public.update_reservations_on_production();

-- Hiçbir trigger'a bağlı olmayan eski trigger fonksiyonu (adı RPC'nin çağırdığı fonksiyonla çakışıyordu)
drop function if exists public.release_reservations_on_plan_cancel();

-- Rezervasyon satırlarına miktar dağıtan yardımcı: aynı sipariş+malzeme için birden fazla satır olabilir
--   p_consume: tüketilen miktar  → consumed_quantity artar
--   p_release: serbest bırakılan → reserved_quantity azalır
--   p_final_status: satır tamamen kapanınca verilecek durum ('completed' / 'cancelled')
create or replace function public._allocate_reservation(
  p_order_id text, p_material_type text, p_material_id uuid,
  p_consume numeric, p_release numeric, p_final_status text
) returns void language plpgsql as $$
declare
  r record;
  v_left_consume numeric := greatest(coalesce(p_consume, 0), 0);
  v_left_release numeric := greatest(coalesce(p_release, 0), 0);
  v_open numeric;      -- satırda henüz tüketilmemiş/serbest bırakılmamış miktar
  v_take numeric;      -- bu satırdan tüketilen
  v_rel numeric;       -- bu satırdan serbest bırakılan
  v_status text;
begin
  for r in
    select * from material_reservations
    where order_id = p_order_id
      and material_type = p_material_type
      and material_id = p_material_id
      and order_type in ('production_order', 'production_plan')
      and status = 'active'
    order by created_at, id
    for update
  loop
    v_open := greatest(coalesce(r.reserved_quantity, 0) - coalesce(r.consumed_quantity, 0), 0);

    v_take := least(v_open, v_left_consume);
    v_left_consume := v_left_consume - v_take;
    v_open := v_open - v_take;

    v_rel := least(v_open, v_left_release);
    v_left_release := v_left_release - v_rel;
    v_open := v_open - v_rel;

    -- Satır kapandıysa: serbest bırakma kapattıysa p_final_status, tüketim kapattıysa 'completed'
    if v_open <= 0 then
      v_status := case when v_rel > 0 then p_final_status else 'completed' end;
    else
      v_status := 'active';
    end if;

    update material_reservations
    set consumed_quantity = coalesce(consumed_quantity, 0) + v_take,
        reserved_quantity = reserved_quantity - v_rel,
        status = v_status,
        updated_at = now()
    where id = r.id;

    exit when v_left_consume <= 0 and v_left_release <= 0;
  end loop;
end;
$$;

-- (1) Üretim tüketimi: stok + reserved düşümü aynı; rezervasyon satırı artık doğru güncellenir
create or replace function public.consume_materials_on_production()
returns trigger language plpgsql as $$
declare
  v_bom_record record;
  v_consumption numeric;
  v_before_qty numeric;
  v_after_qty numeric;
  v_product_name text;
  v_product_code text;
  v_order_id uuid;
begin
  select fp.name, fp.code, pp.order_id
    into v_product_name, v_product_code, v_order_id
  from production_plans pp
  join finished_products fp on pp.product_id = fp.id
  where pp.id = new.plan_id;

  for v_bom_record in
    select material_type, material_id, material_code, material_name, quantity_needed
    from production_plan_bom_snapshot
    where plan_id = new.plan_id
  loop
    v_consumption := v_bom_record.quantity_needed * new.quantity_produced;
    if v_consumption is null or v_consumption = 0 then
      continue;
    end if;

    if v_bom_record.material_type = 'raw' then
      select quantity into v_before_qty from raw_materials where id = v_bom_record.material_id;
      update raw_materials
      set quantity = greatest(quantity - v_consumption, 0),
          reserved_quantity = greatest(reserved_quantity - v_consumption, 0)
      where id = v_bom_record.material_id;
      select quantity into v_after_qty from raw_materials where id = v_bom_record.material_id;
    elsif v_bom_record.material_type = 'semi' then
      select quantity into v_before_qty from semi_finished_products where id = v_bom_record.material_id;
      update semi_finished_products
      set quantity = greatest(quantity - v_consumption, 0),
          reserved_quantity = greatest(reserved_quantity - v_consumption, 0)
      where id = v_bom_record.material_id;
      select quantity into v_after_qty from semi_finished_products where id = v_bom_record.material_id;
    end if;

    if v_order_id is not null then
      perform _allocate_reservation(v_order_id::text, v_bom_record.material_type, v_bom_record.material_id,
                                    v_consumption, 0, 'completed');
    end if;

    insert into stock_movements (
      material_type, material_id, movement_type, quantity,
      before_quantity, after_quantity, user_id, description
    ) values (
      v_bom_record.material_type, v_bom_record.material_id, 'uretim', v_consumption,
      v_before_qty, v_after_qty, new.operator_id,
      format('Üretim tüketimi: %s adet %s (%s) için %s adet %s',
        new.quantity_produced, coalesce(v_product_name, 'Bilinmeyen'), coalesce(v_product_code, 'N/A'),
        v_consumption, coalesce(v_bom_record.material_name, 'Bilinmeyen'))
    );
  end loop;

  return new;
end;
$$;

-- Planın üretilmemiş kısmının rezervasyonunu serbest bırakır (stoğa ekleme YAPMAZ)
create or replace function public._release_plan_reservations(p_plan_id uuid, p_final_status text)
returns void language plpgsql as $$
declare
  v_plan record;
  v_item record;
  v_remaining_units numeric;
  v_release numeric;
begin
  select id, order_id, planned_quantity, produced_quantity into v_plan
  from production_plans where id = p_plan_id;
  if not found then
    return;
  end if;

  v_remaining_units := greatest(coalesce(v_plan.planned_quantity, 0) - coalesce(v_plan.produced_quantity, 0), 0);

  for v_item in
    select material_type, material_id, quantity_needed
    from production_plan_bom_snapshot where plan_id = p_plan_id
  loop
    v_release := coalesce(v_item.quantity_needed, 0) * v_remaining_units;

    if v_release > 0 then
      if v_item.material_type = 'raw' then
        update raw_materials set reserved_quantity = greatest(reserved_quantity - v_release, 0)
        where id = v_item.material_id;
      elsif v_item.material_type = 'semi' then
        update semi_finished_products set reserved_quantity = greatest(reserved_quantity - v_release, 0)
        where id = v_item.material_id;
      end if;

      insert into stock_movements (material_type, material_id, movement_type, quantity, description)
      values (v_item.material_type, v_item.material_id, 'rezervasyon_iptali', v_release,
              format('Rezervasyon serbest bırakıldı (%s): plan %s, üretilmeyen %s adet',
                     p_final_status, p_plan_id, v_remaining_units));
    end if;

    perform _allocate_reservation(v_plan.order_id::text, v_item.material_type, v_item.material_id,
                                  0, v_release, p_final_status);
  end loop;
end;
$$;

-- (2) RPC'lerin çağırdığı iptal fonksiyonu (önceden sadece NOTICE basıyordu)
create or replace function public.release_reservations_on_plan_cancel(p_plan_id uuid)
returns void language plpgsql as $$
begin
  perform _release_plan_reservations(p_plan_id, 'cancelled');
end;
$$;

-- (3) Tamamlama: kalan rezervasyonu SADECE reserved_quantity'den düşer (stoğa eklemez)
create or replace function public.cleanup_reservations_on_plan_complete()
returns trigger language plpgsql as $$
begin
  if new.status = 'tamamlandi' and old.status is distinct from 'tamamlandi' then
    perform _release_plan_reservations(new.id, 'completed');
  end if;
  return new;
end;
$$;

commit;
