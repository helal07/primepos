import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProducts, useProductMutations, useCategories, useBrands, useUnits, useVariations, useVariationMutations } from "@/hooks/useInventory";

import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Upload, X, ImageIcon, Save, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSellingPriceGroups, useProductGroupPrices, useProductGroupPriceMutations } from "@/hooks/usePriceGroups";
import { QuickAddDialog } from "@/components/inventory/QuickAddDialog";
import { useWarrantyTypes, warrantyLabel, warrantyToMonths } from "@/hooks/useWarranties";


const PRODUCT_TYPES = [
  { value: "general", label: "General" },
  { value: "imei", label: "IMEI" },
  { value: "serial", label: "Serial" },
  { value: "combo", label: "Combo" },
  { value: "service", label: "Service" },
];

const defaultForm = {
  name: "", alt_name: "", sku: "", barcode: "", description: "",
  category_id: "", brand_id: "", unit_id: "",
  purchase_price: "0", selling_price: "0", tax_percent: "0",
  stock_quantity: "0", alert_quantity: "5",
  is_active: true, has_warranty: false,
  warranty_duration: "", warranty_type: "", warranty_id: "",

  serial_tracking: false, product_type: "general",
  show_on_website: true, image_url: "",
};

export default function ProductAdd() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const { data: products } = useProducts();
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const { data: units } = useUnits();
  const { create, update } = useProductMutations();
  const { toast } = useToast();
  const { data: variations } = useVariations(editId);
  const varMutations = useVariationMutations();
  const { data: priceGroups } = useSellingPriceGroups();
  const { data: productGroupPrices } = useProductGroupPrices(editId);
  const groupPriceMutations = useProductGroupPriceMutations();
  const [groupPriceRows, setGroupPriceRows] = useState<Record<string, { price: string; price_type: "fixed" | "percent" }>>({});

  useEffect(() => {
    if (!productGroupPrices) return;
    const map: Record<string, { price: string; price_type: "fixed" | "percent" }> = {};
    for (const r of productGroupPrices) {
      if (r.variation_id) continue; // base product overrides only here
      map[r.selling_price_group_id] = { price: String(r.price), price_type: r.price_type };
    }
    setGroupPriceRows(map);
  }, [productGroupPrices]);

  const { data: warrantyTypes = [] } = useWarrantyTypes();
  const [form, setForm] = useState(defaultForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showVarForm, setShowVarForm] = useState(false);
  const [varEditId, setVarEditId] = useState<string | null>(null);
  const defaultVar = { name: "", sku: "", barcode: "", purchase_price: "0", selling_price: "0", stock_quantity: "0", alert_quantity: "5" };
  const [varForm, setVarForm] = useState(defaultVar);

  // Load product for editing
  useEffect(() => {
    if (editId && products) {
      const p = products.find((x: any) => x.id === editId);
      if (p) {
        setForm({
          name: p.name, alt_name: "", sku: p.sku || "", barcode: p.barcode || "",
          description: p.description || "",
          category_id: p.category_id || "", brand_id: p.brand_id || "", unit_id: p.unit_id || "",
          purchase_price: String(p.purchase_price), selling_price: String(p.selling_price),
          tax_percent: String(p.tax_percent), stock_quantity: String(p.stock_quantity),
          alert_quantity: String(p.alert_quantity), is_active: p.is_active,
          has_warranty: p.has_warranty, warranty_duration: p.warranty_duration ? String(p.warranty_duration) : "",
          warranty_type: p.warranty_type || "", warranty_id: (p as any).warranty_id || "",
          serial_tracking: p.serial_tracking,

          product_type: (p as any).product_type || "general",
          show_on_website: (p as any).show_on_website !== false,
          image_url: p.image_url || "",
        });
        if (p.image_url) setImagePreview(p.image_url);
      }
    }
  }, [editId, products]);

  // Auto-disable website for service type
  useEffect(() => {
    if (form.product_type === "service") {
      setForm(prev => ({ ...prev, show_on_website: false }));
    }
  }, [form.product_type]);

  const isService = form.product_type === "service";
  const purchasePrice = parseFloat(form.purchase_price) || 0;
  const sellingPrice = parseFloat(form.selling_price) || 0;
  const profitMargin = purchasePrice > 0 ? (((sellingPrice - purchasePrice) / purchasePrice) * 100).toFixed(1) : "0.0";

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleImageSelect(file);
  }, []);

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return form.image_url || null;
    setUploading(true);
    const { compressImage } = await import("@/lib/compressImage");
    const compressed = await compressImage(imageFile, { maxWidth: 1200, maxHeight: 1200, quality: 0.82 });
    const ext = compressed.name.split(".").pop();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    try {
      const { uploadFile } = await import("@/lib/storage");
      const { url } = await uploadFile("product-images", compressed, { filename });
      setUploading(false);
      return url;
    } catch (e: any) {
      setUploading(false);
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast({ title: "Product name is required", variant: "destructive" }); return; }
    const imageUrl = await uploadImage();
    const payload: any = {
      name: form.name, sku: form.sku || null, barcode: form.barcode || null,
      description: form.description || null,
      category_id: form.category_id || null, brand_id: form.brand_id || null, unit_id: form.unit_id || null,
      purchase_price: purchasePrice, selling_price: sellingPrice,
      tax_percent: parseFloat(form.tax_percent) || 0,
      stock_quantity: isService ? 0 : (parseInt(form.stock_quantity) || 0),
      alert_quantity: isService ? 0 : (parseInt(form.alert_quantity) || 5),
      is_active: form.is_active, has_warranty: form.has_warranty,
      warranty_duration: form.warranty_duration ? parseInt(form.warranty_duration) : null,
      warranty_type: form.warranty_type || null,
      warranty_id: form.has_warranty ? (form.warranty_id || null) : null,

      serial_tracking: form.serial_tracking,
      product_type: form.product_type,
      show_on_website: form.show_on_website,
      image_url: imageUrl,
    };

    if (editId) {
      update.mutate({ id: editId, ...payload }, {
        onSuccess: async () => {
          await saveGroupPrices(editId);
          navigate("/products");
        },
      });
    } else {
      create.mutate(payload, { onSuccess: () => navigate("/products") });
    }
  };

  const saveGroupPrices = async (productId: string) => {
    const rows = Object.entries(groupPriceRows)
      .filter(([, v]) => v.price !== "" && !isNaN(parseFloat(v.price)))
      .map(([groupId, v]) => ({
        product_id: productId,
        variation_id: null,
        selling_price_group_id: groupId,
        price: parseFloat(v.price),
        price_type: v.price_type,
      }));
    if (rows.length) await groupPriceMutations.upsert.mutateAsync(rows);
  };

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => navigate("/products")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <PageHeader title={editId ? "Edit Product" : "Add Product"} description="Fill in the product details below" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column — Main Info */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Product Type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Product Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => set("product_type", t.value)}
                    className={`px-4 min-h-[44px] py-2 rounded-lg text-sm font-medium border transition-colors active:scale-[0.97] ${
                      form.product_type === t.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {isService && (
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">⚠ Service products won't appear on the website and have no stock tracking.</p>
              )}
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>Product Name *</Label>
                  <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Enter product name" />
                </div>
                <div className="space-y-2">
                  <Label>Alternative Name</Label>
                  <Input value={form.alt_name} onChange={e => set("alt_name", e.target.value)} placeholder="বাংলা / other name" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Product description..." rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pricing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>Purchase Price</Label>
                  <Input type="number" step="0.01" value={form.purchase_price} onChange={e => set("purchase_price", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Selling Price</Label>
                  <Input type="number" step="0.01" value={form.selling_price} onChange={e => set("selling_price", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tax %</Label>
                  <Input type="number" step="0.01" value={form.tax_percent} onChange={e => set("tax_percent", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Profit Margin</Label>
                  <div className="h-10 flex items-center px-3 rounded-md border bg-muted/50">
                    <span className={`text-sm font-semibold ${parseFloat(profitMargin) >= 0 ? "text-green-600" : "text-destructive"}`}>
                      {profitMargin}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selling Price Group Overrides — edit mode only */}
          {editId && priceGroups && priceGroups.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Price Group Overrides</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Set tier-specific prices. Leave blank to use the default selling price for that group.
                </p>
                <div className="space-y-3">
                  {priceGroups.filter(g => g.is_active).map((g) => {
                    const row = groupPriceRows[g.id] || { price: "", price_type: "fixed" as const };
                    return (
                      <div key={g.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:items-center border sm:border-0 rounded-lg p-3 sm:p-0">
                        <div className="sm:col-span-4 text-sm font-medium">{g.name}</div>
                        <div className="sm:col-span-4">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Price / %"
                            value={row.price}
                            onChange={(e) => setGroupPriceRows(prev => ({ ...prev, [g.id]: { ...row, price: e.target.value } }))}
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <Select
                            value={row.price_type}
                            onValueChange={(v) => setGroupPriceRows(prev => ({ ...prev, [g.id]: { ...row, price_type: v as "fixed" | "percent" } }))}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fixed (৳)</SelectItem>
                              <SelectItem value="percent">Percent (% of base)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Classification */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Classification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <div className="flex gap-2">
                    <Select value={form.category_id || "none"} onValueChange={v => set("category_id", v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {categories?.filter(c => c.is_active).map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <QuickAddDialog kind="category" onCreated={(id) => id && set("category_id", id)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <div className="flex gap-2">
                    <Select value={form.brand_id || "none"} onValueChange={v => set("brand_id", v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {brands?.filter(b => b.is_active).map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <QuickAddDialog kind="brand" onCreated={(id) => id && set("brand_id", id)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <div className="flex gap-2">
                    <Select value={form.unit_id || "none"} onValueChange={v => set("unit_id", v === "none" ? "" : v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {units?.filter(u => u.is_active).map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name} ({u.short_name})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <QuickAddDialog kind="unit" onCreated={(id) => id && set("unit_id", id)} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Identifiers & Stock */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Identifiers & Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>SKU / Code</Label>
                  <Input value={form.sku} onChange={e => set("sku", e.target.value)} placeholder="Auto if empty" />
                </div>
                <div className="space-y-2">
                  <Label>Barcode</Label>
                  <Input value={form.barcode} onChange={e => set("barcode", e.target.value)} placeholder="Barcode" />
                </div>
                {!isService && (
                  <>
                    <div className="space-y-2">
                      <Label>Opening Stock</Label>
                      <Input type="number" value={form.stock_quantity} onChange={e => set("stock_quantity", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Alert Quantity</Label>
                      <Input type="number" value={form.alert_quantity} onChange={e => set("alert_quantity", e.target.value)} />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Warranty */}
          {form.has_warranty && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Warranty & Guarantee</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label>Warranty Period</Label>
                    <Select
                      value={form.warranty_id || "custom"}
                      onValueChange={v => {
                        if (v === "custom") { set("warranty_id", ""); return; }
                        const w = warrantyTypes.find(x => x.id === v);
                        setForm(f => ({
                          ...f,
                          warranty_id: v,
                          warranty_duration: w ? String(warrantyToMonths(w.duration, w.duration_type)) : f.warranty_duration,
                        }));
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select warranty" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">Custom (manual months)</SelectItem>
                        {warrantyTypes.filter(w => w.is_active !== false).map(w => (
                          <SelectItem key={w.id} value={w.id}>{warrantyLabel(w)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Manage periods in Product → Warranties.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (months)</Label>
                    <Input type="number" value={form.warranty_duration} onChange={e => { set("warranty_duration", e.target.value); set("warranty_id", ""); }} />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.warranty_type || "manufacturer"} onValueChange={v => set("warranty_type", v)}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manufacturer">Manufacturer</SelectItem>
                        <SelectItem value="seller">Seller</SelectItem>
                        <SelectItem value="extended">Extended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>

            </Card>
          )}

          {/* Product Variations — only in edit mode */}
          {!editId && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Product Variations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-4">
                  Save the product first, then add variations (e.g. Red / 128GB) here.
                </p>
              </CardContent>
            </Card>
          )}
          {editId && (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Product Variations</CardTitle>
                <Button size="sm" variant="outline" onClick={() => { setShowVarForm(true); setVarEditId(null); setVarForm(defaultVar); }}>
                  <Plus className="mr-1 h-3 w-3" /> Add Variation
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {showVarForm && (
                  <div className="border rounded-lg p-3 sm:p-4 space-y-3 bg-muted/30">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm">Name *</Label>
                        <Input value={varForm.name} onChange={e => setVarForm({ ...varForm, name: e.target.value })} placeholder="e.g. Red / 128GB" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">SKU</Label>
                        <Input value={varForm.sku} onChange={e => setVarForm({ ...varForm, sku: e.target.value })} placeholder="SKU" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Barcode</Label>
                        <Input value={varForm.barcode} onChange={e => setVarForm({ ...varForm, barcode: e.target.value })} placeholder="Barcode" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Purchase Price</Label>
                        <Input type="number" step="0.01" value={varForm.purchase_price} onChange={e => setVarForm({ ...varForm, purchase_price: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Selling Price</Label>
                        <Input type="number" step="0.01" value={varForm.selling_price} onChange={e => setVarForm({ ...varForm, selling_price: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm">Stock</Label>
                        <Input type="number" value={varForm.stock_quantity} onChange={e => setVarForm({ ...varForm, stock_quantity: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button className="flex-1 sm:flex-none" disabled={!varForm.name} onClick={() => {
                        const payload = {
                          product_id: editId,
                          name: varForm.name,
                          sku: varForm.sku || null,
                          barcode: varForm.barcode || null,
                          purchase_price: parseFloat(varForm.purchase_price) || 0,
                          selling_price: parseFloat(varForm.selling_price) || 0,
                          stock_quantity: parseInt(varForm.stock_quantity) || 0,
                          alert_quantity: parseInt(varForm.alert_quantity) || 5,
                        };
                        if (varEditId) {
                          varMutations.update.mutate({ id: varEditId, ...payload }, { onSuccess: () => { setShowVarForm(false); setVarEditId(null); } });
                        } else {
                          varMutations.create.mutate(payload, { onSuccess: () => { setShowVarForm(false); } });
                        }
                      }}>
                        {varEditId ? "Update" : "Add"}
                      </Button>
                      <Button variant="ghost" className="flex-1 sm:flex-none" onClick={() => { setShowVarForm(false); setVarEditId(null); }}>Cancel</Button>
                    </div>
                  </div>
                )}

                {variations && variations.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead className="hidden sm:table-cell">SKU</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead className="text-right w-20">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {variations.map((v: any) => (
                          <TableRow key={v.id}>
                            <TableCell className="font-medium">{v.name}</TableCell>
                            <TableCell className="hidden sm:table-cell text-muted-foreground">{v.sku || "—"}</TableCell>
                            <TableCell className="text-right">৳{Number(v.selling_price).toLocaleString()}</TableCell>
                            <TableCell className="text-right">{v.stock_quantity}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                                setVarEditId(v.id);
                                setVarForm({
                                  name: v.name, sku: v.sku || "", barcode: v.barcode || "",
                                  purchase_price: String(v.purchase_price), selling_price: String(v.selling_price),
                                  stock_quantity: String(v.stock_quantity), alert_quantity: String(v.alert_quantity),
                                });
                                setShowVarForm(true);
                              }}>
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => varMutations.remove.mutate(v.id)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : !showVarForm && (
                  <p className="text-sm text-muted-foreground text-center py-4">No variations yet. Add one above.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column — Image & Options */}
        <div className="space-y-4 sm:space-y-6">
          {/* Image Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Product Image</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                  dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                }`}
                onClick={() => document.getElementById("product-image-input")?.click()}
              >
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-contain rounded" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(null); set("image_url", ""); }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Drag & drop or click to upload</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                  </div>
                )}
                <input
                  id="product-image-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleImageSelect(e.target.files[0])}
                />
              </div>
            </CardContent>
          </Card>

          {/* Options */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex items-center justify-between min-h-[44px] py-1">
                <Label>Active</Label>
                <Switch checked={form.is_active} onCheckedChange={v => set("is_active", v)} />
              </div>
              <div className="flex items-center justify-between min-h-[44px] py-1">
                <div>
                  <Label>Show on Website</Label>
                  {isService && <p className="text-xs text-muted-foreground">Disabled for Service type</p>}
                </div>
                <Switch checked={form.show_on_website} onCheckedChange={v => set("show_on_website", v)} disabled={isService} />
              </div>
              <div className="flex items-center justify-between min-h-[44px] py-1">
                <Label>Serial Tracking</Label>
                <Switch checked={form.serial_tracking} onCheckedChange={v => set("serial_tracking", v)} />
              </div>
              <div className="flex items-center justify-between min-h-[44px] py-1">
                <Label>Has Warranty</Label>
                <Switch checked={form.has_warranty} onCheckedChange={v => set("has_warranty", v)} />
              </div>
            </CardContent>
          </Card>

          {/* Save (desktop inline) */}
          <Button className="w-full hidden lg:flex" size="lg" onClick={handleSubmit} disabled={!form.name || create.isPending || update.isPending || uploading}>
            <Save className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : editId ? "Update Product" : "Save Product"}
          </Button>
        </div>
      </div>

      {/* Sticky save bar on mobile/tablet */}
      <div className="lg:hidden fixed bottom-16 inset-x-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 bg-gradient-to-t from-background via-background/95 to-background/0 pointer-events-none">
        <Button
          className="w-full pointer-events-auto shadow-lg"
          size="lg"
          onClick={handleSubmit}
          disabled={!form.name || create.isPending || update.isPending || uploading}
        >
          <Save className="mr-2 h-4 w-4" />
          {uploading ? "Uploading..." : editId ? "Update Product" : "Save Product"}
        </Button>
      </div>
    </div>
  );
}
