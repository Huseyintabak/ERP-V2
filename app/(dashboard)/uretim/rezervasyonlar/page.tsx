import ReservationManager from '@/components/reservations/reservation-manager';

export default function RezervasyonlarPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Malzeme Rezervasyon Yönetimi</h1>
        <p className="text-muted-foreground mt-2">
          Üretim siparişleri için malzeme rezervasyonlarını yönetin
        </p>
      </div>
      
      <ReservationManager />
    </div>
  );
}
