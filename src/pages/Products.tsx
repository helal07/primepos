import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const products = [
  { id: 1, name: "iPhone 15 Pro Max", sku: "IPH-15PM", category: "Smartphones", stock: 45, price: 1299, status: "active" },
  { id: 2, name: "Samsung Galaxy S24", sku: "SAM-S24", category: "Smartphones", stock: 32, price: 899, status: "active" },
  { id: 3, name: "MacBook Air M3", sku: "MAC-AIR3", category: "Laptops", stock: 8, price: 1299, status: "low" },
  { id: 4, name: "AirPods Pro 2", sku: "AIR-PRO2", category: "Audio", stock: 120, price: 249, status: "active" },
  { id: 5, name: "iPad Pro 12.9", sku: "IPD-PR12", category: "Tablets", stock: 0, price: 1099, status: "out" },
];

export default function Products() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage your product inventory"
        actions={
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Product
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search products..." className="pl-9 h-9" />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-1" /> Filters
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} className="cursor-pointer">
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{product.category}</TableCell>
                    <TableCell className="text-right">{product.stock}</TableCell>
                    <TableCell className="text-right">${product.price}</TableCell>
                    <TableCell>
                      <Badge
                        variant={product.status === "active" ? "default" : product.status === "low" ? "secondary" : "destructive"}
                      >
                        {product.status === "active" ? "In Stock" : product.status === "low" ? "Low Stock" : "Out of Stock"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
