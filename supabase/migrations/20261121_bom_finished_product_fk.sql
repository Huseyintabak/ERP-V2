-- bom.finished_product_id için foreign key (2026-11-21, VPS'te uygulandı)
--
-- semi_bom'da FK + ON DELETE CASCADE vardı, bom'da yoktu: nihai ürün silinince BOM satırları
-- yetim kalıyordu (ürün silme API'sindeki "BOM'da kullanılıyor" kontrolü yanlış kolona
-- (bom.product_id) baktığı için hiç çalışmıyordu). 4 yetim satır vardı (Ekim 2025).

begin;

delete from public.bom b
where not exists (select 1 from public.finished_products f where f.id = b.finished_product_id);

alter table public.bom
  add constraint bom_finished_product_id_fkey
  foreign key (finished_product_id) references public.finished_products(id) on delete cascade;

commit;
