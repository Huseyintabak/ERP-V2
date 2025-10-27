'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Package, 
  TreePine, 
  Search,
  Save,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { ReactFlow, Node, Edge, addEdge, Connection, useNodesState, useEdgesState, Controls, Background, MiniMap, EdgeLabelRenderer, getBezierPath, Handle } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { logger } from '@/lib/utils/logger';

interface BomNode {
  id: string;
  type: 'product' | 'raw' | 'semi';
  data: {
    label: string;
    code: string;
    quantity: number;
    unit: string;
    cost?: number;
    stock?: number;
    isRoot?: boolean;
  };
  position: { x: number; y: number };
}

interface BomVisualTreeProps {
  productId: string;
  productName: string;
  onSave: (bomData: any) => void;
  initialData?: any;
}

export function BomVisualTree({ 
  productId, 
  productName, 
  onSave, 
  initialData 
}: BomVisualTreeProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<BomNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states for add/edit
  const [formData, setFormData] = useState({
    materialId: '',
    quantity: 1,
    unit: 'adet'
  });

  // Initialize with root product node and BOM data
  useMemo(() => {
    if (productId && !nodes.length) {
      const rootNode: BomNode = {
        id: productId,
        type: 'product',
        data: {
          label: productName,
          code: productId.slice(0, 8),
          quantity: 1,
          unit: 'adet',
          isRoot: true
        },
        position: { x: 250, y: 50 }
      };
      
      const initialNodes = [rootNode];
      const initialEdges: any[] = [];
      
      // Add BOM materials from initialData if available
      if (initialData && initialData.materials && initialData.materials.length > 0) {
        // Group materials by type for better visualization
        const rawMaterials = initialData.materials.filter((m: any) => m.material_type === 'raw');
        const semiMaterials = initialData.materials.filter((m: any) => m.material_type === 'semi');
        
        // Position raw materials at the bottom
        rawMaterials.forEach((material: any, index: number) => {
          const materialNode: BomNode = {
            id: `material-${material.id}`,
            type: 'raw',
            data: {
              label: material.material.name,
              code: material.material.code,
              quantity: material.quantity_needed,
              unit: material.material.unit,
              cost: material.material.unit_price || material.material.unit_cost || 0
            },
            position: { 
              x: 100 + (index * 150), 
              y: 350 
            }
          };
          
          initialNodes.push(materialNode);
          
          // Create edge from root to material with label
          initialEdges.push({
            id: `edge-${productId}-${material.id}`,
            source: productId,
            sourceHandle: 'bottom',
            target: `material-${material.id}`,
            targetHandle: 'top',
            type: 'custom',
            animated: true,
            style: { stroke: '#ef4444', strokeWidth: 2 },
            data: { label: `${material.quantity_needed} ${material.material.unit}` }
          });
        });
        
        // Position semi-finished materials in the middle
        semiMaterials.forEach((material: any, index: number) => {
          const materialNode: BomNode = {
            id: `material-${material.id}`,
            type: 'semi',
            data: {
              label: material.material.name,
              code: material.material.code,
              quantity: material.quantity_needed,
              unit: material.material.unit,
              cost: material.material.unit_price || material.material.unit_cost || 0
            },
            position: { 
              x: 200 + (index * 150), 
              y: 200 
            }
          };
          
          initialNodes.push(materialNode);
          
          // Create edge from root to material with label
          initialEdges.push({
            id: `edge-${productId}-${material.id}`,
            source: productId,
            sourceHandle: 'bottom',
            target: `material-${material.id}`,
            targetHandle: 'top',
            type: 'custom',
            animated: true,
            style: { stroke: '#f59e0b', strokeWidth: 2 },
            data: { label: `${material.quantity_needed} ${material.material.unit}` }
          });
        });
      }
      
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
  }, [productId, productName, nodes.length, initialData]);

  // Update nodes when initialData changes
  useEffect(() => {
    if (initialData && initialData.materials && initialData.materials.length > 0) {
      const rootNode: BomNode = {
        id: productId,
        type: 'product',
        data: {
          label: productName,
          code: productId.slice(0, 8),
          quantity: 1,
          unit: 'adet',
          isRoot: true
        },
        position: { x: 400, y: 50 }
      };
      
      const updatedNodes = [rootNode];
      const updatedEdges: any[] = [];
      
      // Group materials by type for better visualization
      const rawMaterials = initialData.materials.filter((m: any) => m.material_type === 'raw');
      const semiMaterials = initialData.materials.filter((m: any) => m.material_type === 'semi');
      
      // Position raw materials at the bottom
      rawMaterials.forEach((material: any, index: number) => {
        const materialNode: BomNode = {
          id: `material-${material.id}`,
          type: 'raw',
          data: {
            label: material.material.name,
            code: material.material.code,
            quantity: material.quantity_needed,
            unit: material.material.unit,
            cost: material.material.unit_price || material.material.unit_cost || 0
          },
          position: { 
            x: 100 + (index * 150), 
            y: 350 
          }
        };
        
        updatedNodes.push(materialNode);
        
        // Create edge from root to material with label
        updatedEdges.push({
          id: `edge-${productId}-${material.id}`,
          source: productId,
          sourceHandle: 'bottom',
          target: `material-${material.id}`,
          targetHandle: 'top',
          type: 'custom',
          animated: true,
          style: { stroke: '#ef4444', strokeWidth: 2 },
          data: { label: `${material.quantity_needed} ${material.material.unit}` }
        });
      });
      
      // Position semi-finished materials in the middle
      semiMaterials.forEach((material: any, index: number) => {
        const materialNode: BomNode = {
          id: `material-${material.id}`,
          type: 'semi',
          data: {
            label: material.material.name,
            code: material.material.code,
            quantity: material.quantity_needed,
            unit: material.material.unit,
            cost: material.material.unit_price || material.material.unit_cost || 0
          },
          position: { 
            x: 200 + (index * 150), 
            y: 200 
          }
        };
        
        updatedNodes.push(materialNode);
        
        // Create edge from root to material with label
        updatedEdges.push({
          id: `edge-${productId}-${material.id}`,
          source: productId,
          sourceHandle: 'bottom',
          target: `material-${material.id}`,
          targetHandle: 'top',
          type: 'custom',
          animated: true,
          style: { stroke: '#f59e0b', strokeWidth: 2 },
          data: { label: `${material.quantity_needed} ${material.material.unit}` }
        });
      });
      
      setNodes(updatedNodes);
      setEdges(updatedEdges);
    }
  }, [initialData, productId, productName]);

  // Load materials for selection
  const loadMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const [rawResponse, semiResponse] = await Promise.all([
        fetch('/api/stock/raw'),
        fetch('/api/stock/semi')
      ]);

      const [rawData, semiData] = await Promise.all([
        rawResponse.json(),
        semiResponse.json()
      ]);

      const allMaterials = [
        ...(rawData.data || []).map((item: any) => ({
          ...item,
          type: 'raw',
          name: item.name,
          code: item.code,
          unit: item.unit || 'kg'
        })),
        ...(semiData.data || []).map((item: any) => ({
          ...item,
          type: 'semi',
          name: item.name,
          code: item.code,
          unit: item.unit || 'adet'
        }))
      ];

      setMaterials(allMaterials);
    } catch (error) {
      logger.error('Error loading materials:', error);
      toast.error('Malzemeler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter materials based on search
  const filteredMaterials = useMemo(() => {
    if (!searchTerm) return materials;
    return materials.filter(material =>
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [materials, searchTerm]);

  // Handle adding new material to BOM
  const handleAddMaterial = () => {
    if (!formData.materialId || !formData.quantity) {
      toast.error('Malzeme ve miktar seçilmelidir');
      return;
    }

    const material = materials.find(m => m.id === formData.materialId);
    if (!material) {
      toast.error('Malzeme bulunamadı');
      return;
    }

    const newNode: BomNode = {
      id: `${material.id}-${Date.now()}`,
      type: material.type,
      data: {
        label: material.name,
        code: material.code,
        quantity: formData.quantity,
        unit: formData.unit,
        cost: material.unit_price || material.unit_cost || 0,
        stock: material.quantity || 0
      },
      position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 150 }
    };

    // Add edge from root to new node
    const newEdge = {
      id: `${productId}-${newNode.id}`,
      source: productId,
      target: newNode.id,
      type: 'smoothstep',
      animated: true
    };

    setNodes(prev => [...prev, newNode]);
    setEdges(prev => [...prev, newEdge]);

    setIsAddDialogOpen(false);
    setFormData({ materialId: '', quantity: 1, unit: 'adet' });
    toast.success('Malzeme BOM\'a eklendi');
  };

  // Handle editing material
  const handleEditMaterial = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      setFormData({
        materialId: node.data.materialId || '',
        quantity: node.data.quantity,
        unit: node.data.unit
      });
      setIsEditDialogOpen(true);
    }
  };

  // Handle updating material
  const handleUpdateMaterial = () => {
    if (!selectedNode || !formData.quantity) {
      toast.error('Miktar belirtilmelidir');
      return;
    }

    setNodes(prev => prev.map(node => 
      node.id === selectedNode.id 
        ? {
            ...node,
            data: {
              ...node.data,
              quantity: formData.quantity,
              unit: formData.unit
            }
          }
        : node
    ));

    setIsEditDialogOpen(false);
    setSelectedNode(null);
    toast.success('Malzeme güncellendi');
  };

  // Handle removing material
  const handleRemoveMaterial = (nodeId: string) => {
    if (nodeId === productId) {
      toast.error('Ana ürün silinemez');
      return;
    }

    setNodes(prev => prev.filter(node => node.id !== nodeId));
    setEdges(prev => prev.filter(edge => 
      edge.source !== nodeId && edge.target !== nodeId
    ));
    toast.success('Malzeme BOM\'dan kaldırıldı');
  };

  // Handle saving BOM
  const handleSave = () => {
    const bomData = {
      productId,
      materials: nodes
        .filter(node => node.id !== productId)
        .map(node => ({
          materialId: node.id.split('-')[0], // Extract original material ID
          materialType: node.type,
          quantity: node.data.quantity,
          unit: node.data.unit
        }))
    };

    onSave(bomData);
    toast.success('BOM kaydedildi');
  };

  // Handle reset
  const handleReset = () => {
    setNodes([{
      id: productId,
      type: 'product',
      data: {
        label: productName,
        code: productId.slice(0, 8),
        quantity: 1,
        unit: 'adet',
        isRoot: true
      },
      position: { x: 250, y: 50 }
    }]);
    setEdges([]);
    toast.success('BOM sıfırlandı');
  };

  // Custom edge component with labels
  const EdgeComponent = ({ id, sourceX, sourceY, targetX, targetY, data, style }: any) => {
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    });

    return (
      <>
        <path
          id={id}
          style={style}
          className="react-flow__edge-path"
          d={edgePath}
        />
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: 'white',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              border: '1px solid #ccc',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
            className="nodrag nopan"
          >
            {data?.label || ''}
          </div>
        </EdgeLabelRenderer>
      </>
    );
  };

  // Custom node component
  const NodeComponent = ({ data, id }: { data: any; id: string }) => {
    const isRoot = data.isRoot;
    
    return (
      <div className={`px-4 py-2 shadow-md rounded-md border-2 ${
        isRoot 
          ? 'bg-blue-50 border-blue-400' 
          : data.type === 'raw' 
            ? 'bg-red-50 border-red-400' 
            : 'bg-yellow-50 border-yellow-400'
      }`}>
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4" />
          <div className="text-sm font-medium">{data.label}</div>
          {!isRoot && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleEditMaterial(id)}
                className="h-6 w-6 p-0"
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveMaterial(id)}
                className="h-6 w-6 p-0 text-red-600"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {data.code} • {data.quantity} {data.unit}
        </div>
        {data.cost && (
          <div className="text-xs text-green-600 mt-1">
            ₺{data.cost.toFixed(2)}
          </div>
        )}
        
        {/* Add handles for connections */}
        <Handle
          type="source"
          position="bottom"
          id="bottom"
          style={{ background: '#555' }}
        />
        <Handle
          type="target"
          position="top"
          id="top"
          style={{ background: '#555' }}
        />
      </div>
    );
  };

  const nodeTypes = useMemo(() => ({
    product: NodeComponent,
    raw: NodeComponent,
    semi: NodeComponent
  }), []);

  const edgeTypes = useMemo(() => ({
    custom: EdgeComponent,
  }), []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TreePine className="h-5 w-5" />
          <h3 className="text-lg font-semibold">BOM Görsel Ağaç</h3>
          <Badge variant="outline">{productName}</Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Sıfırla
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
          >
            <Save className="h-4 w-4 mr-2" />
            Kaydet
          </Button>
        </div>
      </div>

      {/* Add Material Button */}
      <Button
        onClick={() => {
          loadMaterials();
          setIsAddDialogOpen(true);
        }}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Malzeme Ekle
      </Button>

      {/* BOM Tree */}
      <Card>
        <CardContent className="p-0">
          <div style={{ height: '600px', width: '100%' }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              defaultEdgeOptions={{
                animated: true,
                style: { strokeWidth: 2 }
              }}
            >
              <Controls />
              <MiniMap />
              <Background />
            </ReactFlow>
          </div>
        </CardContent>
      </Card>

      {/* Add Material Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Malzeme Ekle</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="search">Malzeme Ara</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Malzeme adı veya kodu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4">Yükleniyor...</div>
              ) : filteredMaterials.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  Malzeme bulunamadı
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMaterials.map((material) => (
                    <div
                      key={material.id}
                      className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        formData.materialId === material.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, materialId: material.id, unit: material.unit }))}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{material.name}</div>
                          <div className="text-sm text-gray-500">
                            {material.code} • {material.type === 'raw' ? 'Hammadde' : 'Yarı Mamul'}
                          </div>
                        </div>
                        <Badge variant="outline">
                          {material.quantity || 0} {material.unit}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Miktar</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="unit">Birim</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleAddMaterial}>
              Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Material Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Malzeme Düzenle</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Malzeme</Label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="font-medium">{selectedNode?.data.label}</div>
                <div className="text-sm text-gray-500">{selectedNode?.data.code}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-quantity">Miktar</Label>
                <Input
                  id="edit-quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-unit">Birim</Label>
                <Input
                  id="edit-unit"
                  value={formData.unit}
                  onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleUpdateMaterial}>
              Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
