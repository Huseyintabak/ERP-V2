'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Radio, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Send,
  Check
} from 'lucide-react';

interface PendingUpdate {
  id: string;
  setting_key: string;
  setting_value: any;
  change_type: string;
  message: string;
  created_at: string;
  changed_by: {
    id: string;
    name: string;
    email: string;
  };
}

interface BroadcastForm {
  setting_key: string;
  setting_value: string;
  change_type: string;
  broadcast_to: string;
  target_roles: string[];
  target_users: string[];
  message: string;
  expires_at: string;
}

export default function RealtimeSettingsBroadcast() {
  const [pendingUpdates, setPendingUpdates] = useState<PendingUpdate[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  
  // Broadcast form
  const [broadcastForm, setBroadcastForm] = useState<BroadcastForm>({
    setting_key: '',
    setting_value: '',
    change_type: 'updated',
    broadcast_to: 'all',
    target_roles: [],
    target_users: [],
    message: '',
    expires_at: ''
  });
  
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);

  const fetchPendingUpdates = async () => {
    try {
      setLoading(true);
      setMessage(null); // Önceki mesajları temizle
      const response = await fetch('/api/settings/pending');
      const data = await response.json();
      
      console.log('📡 Pending updates API response:', { status: response.status, data });
      
      if (response.ok && data.data) {
        // API response format: { data: { success: true, pending_updates: [...] } }
        if (data.data.success !== false) {
          const updates = data.data.pending_updates || data.data || [];
          console.log('✅ Pending updates loaded:', updates.length, 'items');
          setPendingUpdates(Array.isArray(updates) ? updates : []);
          if (updates.length === 0) {
            setMessage({ type: 'info', text: 'Bekleyen güncelleme bulunmuyor' });
          }
        } else {
          console.error('❌ API returned success=false:', data.data);
          setMessage({ type: 'error', text: data.data.message || 'Bekleyen güncellemeler yüklenemedi' });
        }
      } else {
        console.error('❌ API error:', data);
        setMessage({ type: 'error', text: data.error || 'Bekleyen güncellemeler yüklenemedi' });
      }
    } catch (error) {
      console.error('❌ Error fetching pending updates:', error);
      setMessage({ type: 'error', text: 'Bekleyen güncellemeler yüklenemedi' });
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeUpdate = async (settingKey: string) => {
    try {
      setLoading(true);
      setMessage(null);
      const response = await fetch('/api/settings/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting_key: settingKey })
      });
      
      const data = await response.json();
      
      if (response.ok && data.data) {
        if (data.data.success !== false) {
          setMessage({ type: 'success', text: 'Ayar güncellemesi onaylandı ve bildirim oluşturuldu' });
          await fetchPendingUpdates();
        } else {
          setMessage({ type: 'error', text: data.data.message || 'Onaylama işlemi başarısız' });
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Onaylama işlemi başarısız' });
      }
    } catch (error) {
      console.error('Error acknowledging update:', error);
      setMessage({ type: 'error', text: 'Onaylama işlemi başarısız' });
    } finally {
      setLoading(false);
    }
  };

  const sendBroadcast = async () => {
    try {
      setLoading(true);
      
      // JSON parse kontrolü
      let parsedValue;
      try {
        parsedValue = broadcastForm.setting_value ? JSON.parse(broadcastForm.setting_value) : {};
      } catch (parseError) {
        setMessage({ type: 'error', text: 'Ayar değeri geçerli bir JSON formatında olmalı' });
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/settings/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...broadcastForm,
          setting_value: parsedValue,
          target_roles: broadcastForm.target_roles.length > 0 ? broadcastForm.target_roles : null,
          target_users: broadcastForm.target_users.length > 0 ? broadcastForm.target_users : null,
          expires_at: broadcastForm.expires_at || null
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setMessage({ type: 'success', text: data.message || 'Broadcast başarıyla gönderildi' });
        setBroadcastDialogOpen(false);
        setBroadcastForm({
          setting_key: '',
          setting_value: '',
          change_type: 'updated',
          broadcast_to: 'all',
          target_roles: [],
          target_users: [],
          message: '',
          expires_at: ''
        });
        // Bekleyen güncellemeleri yenile
        await fetchPendingUpdates();
      } else {
        setMessage({ type: 'error', text: data.error || 'Broadcast gönderilemedi' });
      }
    } catch (error: any) {
      console.error('Error sending broadcast:', error);
      setMessage({ type: 'error', text: error.message || 'Broadcast gönderme işlemi başarısız' });
    } finally {
      setLoading(false);
    }
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'created': return 'bg-green-500';
      case 'updated': return 'bg-blue-500';
      case 'deleted': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getChangeTypeText = (type: string) => {
    switch (type) {
      case 'created': return 'Oluşturuldu';
      case 'updated': return 'Güncellendi';
      case 'deleted': return 'Silindi';
      default: return 'Bilinmiyor';
    }
  };

  useEffect(() => {
    fetchPendingUpdates();
    
    // Her 30 saniyede bir güncelle
    const interval = setInterval(fetchPendingUpdates, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Real-time Ayar Broadcast</h1>
          <p className="text-muted-foreground">
            Sistem ayarları değişikliklerini tüm kullanıcılara anlık bildirin
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchPendingUpdates} disabled={loading} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Yenile
          </Button>
          <Dialog open={broadcastDialogOpen} onOpenChange={setBroadcastDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Radio className="h-4 w-4 mr-2" />
                Broadcast Gönder
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Yeni Broadcast</DialogTitle>
                <DialogDescription>
                  Sistem ayarları değişikliğini tüm kullanıcılara bildirin
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="setting-key">Ayar Anahtarı</Label>
                    <Input
                      id="setting-key"
                      value={broadcastForm.setting_key}
                      onChange={(e) => setBroadcastForm(prev => ({ ...prev, setting_key: e.target.value }))}
                      placeholder="Örn: system_maintenance_mode"
                    />
                  </div>
                  <div>
                    <Label htmlFor="change-type">Değişiklik Türü</Label>
                    <Select 
                      value={broadcastForm.change_type} 
                      onValueChange={(value) => setBroadcastForm(prev => ({ ...prev, change_type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created">Oluşturuldu</SelectItem>
                        <SelectItem value="updated">Güncellendi</SelectItem>
                        <SelectItem value="deleted">Silindi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="setting-value">Ayar Değeri (JSON)</Label>
                  <Textarea
                    id="setting-value"
                    value={broadcastForm.setting_value}
                    onChange={(e) => setBroadcastForm(prev => ({ ...prev, setting_value: e.target.value }))}
                    placeholder='{"enabled": true, "message": "Sistem bakım modu aktif"}'
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="broadcast-to">Broadcast Hedefi</Label>
                    <Select 
                      value={broadcastForm.broadcast_to} 
                      onValueChange={(value) => setBroadcastForm(prev => ({ ...prev, broadcast_to: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Kullanıcılar</SelectItem>
                        <SelectItem value="role">Belirli Roller</SelectItem>
                        <SelectItem value="user">Belirli Kullanıcılar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="expires-at">Son Geçerlilik</Label>
                    <Input
                      id="expires-at"
                      type="datetime-local"
                      value={broadcastForm.expires_at}
                      onChange={(e) => setBroadcastForm(prev => ({ ...prev, expires_at: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="message">Mesaj</Label>
                  <Textarea
                    id="message"
                    value={broadcastForm.message}
                    onChange={(e) => setBroadcastForm(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Kullanıcılara gösterilecek mesaj..."
                    rows={2}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setBroadcastDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button onClick={sendBroadcast} disabled={loading}>
                    <Send className="h-4 w-4 mr-2" />
                    Broadcast Gönder
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
          <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Bekleyen Güncellemeler */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Bekleyen Ayar Güncellemeleri
          </CardTitle>
          <CardDescription>
            Onaylanmayı bekleyen sistem ayarı değişiklikleri
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingUpdates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ayar</TableHead>
                  <TableHead>Değişiklik</TableHead>
                  <TableHead>Değiştiren</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Mesaj</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUpdates.map((update) => (
                  <TableRow key={update.id}>
                    <TableCell>
                      <div className="font-medium">{update.setting_key}</div>
                      <div className="text-sm text-muted-foreground">
                        {JSON.stringify(update.setting_value, null, 2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getChangeTypeColor(update.change_type)} text-white`}>
                        {getChangeTypeText(update.change_type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{update.changed_by.name}</div>
                        <div className="text-sm text-muted-foreground">{update.changed_by.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(update.created_at).toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">{update.message}</div>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => acknowledgeUpdate(update.setting_key)}
                        disabled={loading}
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Onayla
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <div className="text-lg font-medium">Bekleyen güncelleme yok</div>
              <div className="text-muted-foreground">Tüm ayar güncellemeleri onaylanmış</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Bekleyen Güncellemeler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingUpdates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Son Güncelleme</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {pendingUpdates.length > 0 
                ? new Date(pendingUpdates[0].created_at).toLocaleString('tr-TR')
                : 'Yok'
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Durum</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {pendingUpdates.length === 0 ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Güncel</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-orange-600">Bekleyen Güncellemeler</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
