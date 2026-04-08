import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Configure your business settings" />
      <Tabs defaultValue="business" className="space-y-4">
        <TabsList>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="invoice">Invoice</TabsTrigger>
          <TabsTrigger value="tax">Tax</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card>
            <CardHeader><CardTitle className="text-base">Business Profile</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Company Name</Label><Input placeholder="Your Company" /></div>
                <div className="space-y-2"><Label>Phone</Label><Input placeholder="+1 234 567 890" /></div>
                <div className="space-y-2"><Label>Email</Label><Input placeholder="info@company.com" /></div>
                <div className="space-y-2"><Label>Currency</Label><Input placeholder="USD" /></div>
              </div>
              <div className="space-y-2"><Label>Address</Label><Input placeholder="123 Business St, City, Country" /></div>
              <Separator />
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoice">
          <Card><CardContent className="p-6">
            <p className="text-muted-foreground">Invoice settings coming soon.</p>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="tax">
          <Card><CardContent className="p-6">
            <p className="text-muted-foreground">Tax configuration coming soon.</p>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card><CardContent className="p-6">
            <p className="text-muted-foreground">Notification preferences coming soon.</p>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
