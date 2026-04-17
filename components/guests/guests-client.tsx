"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import {
  Search,
  Plus,
  RefreshCw,
  Loader2,
  User,
  Star,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit2,
  Eye,
  Building2,
  Globe,
  CreditCard,
  Users,
  Crown,
  History,
} from "lucide-react"
import type { Profile } from "@/lib/types"
import useSWR from "swr"

interface Guest {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  passport_number: string | null
  id_number: string | null
  nationality: string | null
  country: string | null
  city: string | null
  address: string | null
  postal_code: string | null
  company: string | null
  loyalty_tier: string | null
  preferences: string | null
  notes: string | null
  is_vip: boolean
  created_at: string
  updated_at: string
}

interface GuestReservation {
  id: string
  reservation_number: string
  check_in_date: string
  check_out_date: string
  status: string
  total_amount: number
  adults: number
  children: number
}

const loyaltyColors: Record<string, string> = {
  bronze: "bg-orange-100 text-orange-800 border-orange-300",
  silver: "bg-slate-100 text-slate-800 border-slate-300",
  gold: "bg-amber-100 text-amber-800 border-amber-300",
  platinum: "bg-indigo-100 text-indigo-800 border-indigo-300",
}

async function fetchGuests() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .order("updated_at", { ascending: false })
  if (error) console.log("[v0] fetchGuests error:", error)
  return (data || []) as Guest[]
}

export function GuestsClient({ profile }: { profile: Profile }) {
  const { data: guests, mutate, isLoading } = useSWR("guests-list", fetchGuests, {
    refreshInterval: 30000,
  })

  const canManage = [
    "system_admin", "general_manager", "front_desk_manager", "front_desk_agent", "reservations_manager",
  ].includes(profile.role)

  const [search, setSearch] = useState("")
  const [vipFilter, setVipFilter] = useState("all")
  const [loyaltyFilter, setLoyaltyFilter] = useState("all")
  const [saving, setSaving] = useState(false)

  // New / Edit guest dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editGuest, setEditGuest] = useState<Guest | null>(null)
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    passport_number: "",
    id_number: "",
    nationality: "",
    country: "",
    city: "",
    address: "",
    postal_code: "",
    company: "",
    loyalty_tier: "",
    preferences: "",
    notes: "",
    is_vip: false,
  })

  // View guest dialog
  const [viewOpen, setViewOpen] = useState(false)
  const [viewGuest, setViewGuest] = useState<Guest | null>(null)
  const [guestReservations, setGuestReservations] = useState<GuestReservation[]>([])
  const [loadingReservations, setLoadingReservations] = useState(false)

  const allGuests = guests || []

  const filteredGuests = allGuests.filter((g) => {
    if (vipFilter === "vip" && !g.is_vip) return false
    if (vipFilter === "regular" && g.is_vip) return false
    if (loyaltyFilter !== "all" && g.loyalty_tier !== loyaltyFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        g.first_name.toLowerCase().includes(q) ||
        g.last_name.toLowerCase().includes(q) ||
        g.email?.toLowerCase().includes(q) ||
        g.phone?.toLowerCase().includes(q) ||
        g.passport_number?.toLowerCase().includes(q) ||
        g.company?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const vipCount = allGuests.filter((g) => g.is_vip).length
  const totalGuests = allGuests.length

  const openNewGuest = () => {
    setEditGuest(null)
    setForm({
      first_name: "", last_name: "", email: "", phone: "", date_of_birth: "",
      passport_number: "", id_number: "", nationality: "", country: "", city: "",
      address: "", postal_code: "", company: "", loyalty_tier: "", preferences: "",
      notes: "", is_vip: false,
    })
    setEditOpen(true)
  }

  const openEditGuest = (g: Guest) => {
    setEditGuest(g)
    setForm({
      first_name: g.first_name || "",
      last_name: g.last_name || "",
      email: g.email || "",
      phone: g.phone || "",
      date_of_birth: g.date_of_birth || "",
      passport_number: g.passport_number || "",
      id_number: g.id_number || "",
      nationality: g.nationality || "",
      country: g.country || "",
      city: g.city || "",
      address: g.address || "",
      postal_code: g.postal_code || "",
      company: g.company || "",
      loyalty_tier: g.loyalty_tier || "",
      preferences: g.preferences || "",
      notes: g.notes || "",
      is_vip: g.is_vip,
    })
    setEditOpen(true)
  }

  const openViewGuest = async (g: Guest) => {
    setViewGuest(g)
    setViewOpen(true)
    setLoadingReservations(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("reservations")
      .select("id, reservation_number, check_in_date, check_out_date, status, total_amount, adults, children")
      .eq("guest_id", g.id)
      .order("check_in_date", { ascending: false })
    setGuestReservations((data || []) as GuestReservation[])
    setLoadingReservations(false)
  }

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      date_of_birth: form.date_of_birth || null,
      passport_number: form.passport_number || null,
      id_number: form.id_number || null,
      nationality: form.nationality || null,
      country: form.country || null,
      city: form.city || null,
      address: form.address || null,
      postal_code: form.postal_code || null,
      company: form.company || null,
      loyalty_tier: form.loyalty_tier || null,
      preferences: form.preferences || null,
      notes: form.notes || null,
      is_vip: form.is_vip,
      updated_at: new Date().toISOString(),
    }

    if (editGuest) {
      await supabase.from("guests").update(payload).eq("id", editGuest.id)
    } else {
      await supabase.from("guests").insert(payload)
    }
    setSaving(false)
    setEditOpen(false)
    mutate()
  }

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-balance">Guest Management</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{totalGuests}</span> total guests
            {vipCount > 0 && (
              <>
                <span className="mx-1.5 text-border">|</span>
                <span className="font-medium text-amber-600">{vipCount} VIP</span>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => mutate()} disabled={isLoading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {canManage && (
            <Button size="sm" onClick={openNewGuest}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Guest
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalGuests}</p>
              <p className="text-xs font-medium text-muted-foreground">Total Guests</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
              <Crown className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{vipCount}</p>
              <p className="text-xs font-medium text-amber-600">VIP Guests</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
              <Globe className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-700">
                {new Set(allGuests.map((g) => g.country).filter(Boolean)).size}
              </p>
              <p className="text-xs font-medium text-emerald-600">Countries</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-700">
                {new Set(allGuests.map((g) => g.company).filter(Boolean)).size}
              </p>
              <p className="text-xs font-medium text-blue-600">Companies</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, phone, passport, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={vipFilter} onValueChange={setVipFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Guests</SelectItem>
            <SelectItem value="vip">VIP Only</SelectItem>
            <SelectItem value="regular">Regular</SelectItem>
          </SelectContent>
        </Select>
        <Select value={loyaltyFilter} onValueChange={setLoyaltyFilter}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="platinum">Platinum</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="silver">Silver</SelectItem>
            <SelectItem value="bronze">Bronze</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Guests List */}
      <div className="flex flex-col gap-2">
        {filteredGuests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Users className="mb-3 h-10 w-10" />
            <p>No guests found</p>
            {search && <p className="text-xs">Try adjusting your search filters</p>}
          </div>
        )}
        {filteredGuests.map((guest) => (
          <Card
            key={guest.id}
            className={`transition-colors hover:bg-muted/30 ${guest.is_vip ? "border-l-4 border-l-amber-400" : ""}`}
          >
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  guest.is_vip ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                }`}>
                  {guest.first_name[0]}{guest.last_name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold">
                      {guest.first_name} {guest.last_name}
                    </span>
                    {guest.is_vip && (
                      <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] px-1.5 py-0">
                        <Star className="mr-0.5 h-2.5 w-2.5" />
                        VIP
                      </Badge>
                    )}
                    {guest.loyalty_tier && (
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 capitalize ${loyaltyColors[guest.loyalty_tier] || ""}`}>
                        {guest.loyalty_tier}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {guest.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {guest.email}
                      </span>
                    )}
                    {guest.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {guest.phone}
                      </span>
                    )}
                    {guest.country && (
                      <span className="flex items-center gap-1">
                        <Globe className="h-3 w-3" /> {guest.country}
                      </span>
                    )}
                    {guest.company && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> {guest.company}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <a href={`/dashboard/guests/${guest.id}`}>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <History className="h-4 w-4" />
                    <span className="sr-only">Профіль гостя</span>
                  </Button>
                </a>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openViewGuest(guest)}>
                  <Eye className="h-4 w-4" />
                  <span className="sr-only">Швидкий перегляд</span>
                </Button>
                {canManage && (
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEditGuest(guest)}>
                    <Edit2 className="h-4 w-4" />
                    <span className="sr-only">Редагувати</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* New / Edit Guest Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editGuest ? "Edit Guest" : "Add New Guest"}</DialogTitle>
            <DialogDescription>
              {editGuest ? "Update guest information." : "Enter the guest details below."}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="contact">Contact & Address</TabsTrigger>
              <TabsTrigger value="hotel">Hotel Info</TabsTrigger>
            </TabsList>
            <TabsContent value="personal" className="flex flex-col gap-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>First Name *</Label>
                  <Input value={form.first_name} onChange={(e) => updateField("first_name", e.target.value)} placeholder="John" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Last Name *</Label>
                  <Input value={form.last_name} onChange={(e) => updateField("last_name", e.target.value)} placeholder="Smith" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Date of Birth</Label>
                  <Input type="date" value={form.date_of_birth} onChange={(e) => updateField("date_of_birth", e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Nationality</Label>
                  <Input value={form.nationality} onChange={(e) => updateField("nationality", e.target.value)} placeholder="e.g. American" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Passport Number</Label>
                  <Input value={form.passport_number} onChange={(e) => updateField("passport_number", e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>ID Number</Label>
                  <Input value={form.id_number} onChange={(e) => updateField("id_number", e.target.value)} />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="contact" className="flex flex-col gap-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="john@example.com" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="+1 555 123 4567" />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder="123 Main St" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>City</Label>
                  <Input value={form.city} onChange={(e) => updateField("city", e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Country</Label>
                  <Input value={form.country} onChange={(e) => updateField("country", e.target.value)} />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Postal Code</Label>
                  <Input value={form.postal_code} onChange={(e) => updateField("postal_code", e.target.value)} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Company</Label>
                <Input value={form.company} onChange={(e) => updateField("company", e.target.value)} placeholder="Company name" />
              </div>
            </TabsContent>
            <TabsContent value="hotel" className="flex flex-col gap-4 pt-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label className="text-base font-medium">VIP Guest</Label>
                  <p className="text-sm text-muted-foreground">Mark this guest as a VIP for special treatment</p>
                </div>
                <Switch checked={form.is_vip} onCheckedChange={(v) => updateField("is_vip", v)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Loyalty Tier</Label>
                <Select value={form.loyalty_tier || "none"} onValueChange={(v) => updateField("loyalty_tier", v === "none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="No tier" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Tier</SelectItem>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Preferences</Label>
                <Textarea
                  value={form.preferences}
                  onChange={(e) => updateField("preferences", e.target.value)}
                  placeholder="Preferred room type, pillow preference, dietary restrictions..."
                  rows={2}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Internal Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="Staff-only notes about the guest..."
                  rows={2}
                />
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.first_name.trim() || !form.last_name.trim() || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editGuest ? "Save Changes" : "Add Guest"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Guest Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {viewGuest?.first_name} {viewGuest?.last_name}
              {viewGuest?.is_vip && (
                <Badge className="bg-amber-100 text-amber-800 border border-amber-300">
                  <Star className="mr-0.5 h-3 w-3" /> VIP
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewGuest && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {viewGuest.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{viewGuest.email}</span>
                  </div>
                )}
                {viewGuest.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{viewGuest.phone}</span>
                  </div>
                )}
                {viewGuest.country && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>{viewGuest.nationality ? `${viewGuest.nationality} / ` : ""}{viewGuest.country}</span>
                  </div>
                )}
                {viewGuest.company && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{viewGuest.company}</span>
                  </div>
                )}
                {viewGuest.date_of_birth && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{new Date(viewGuest.date_of_birth).toLocaleDateString()}</span>
                  </div>
                )}
                {viewGuest.passport_number && (
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span>Passport: {viewGuest.passport_number}</span>
                  </div>
                )}
              </div>

              {(viewGuest.address || viewGuest.city) && (
                <>
                  <Separator />
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <span>
                      {[viewGuest.address, viewGuest.city, viewGuest.postal_code, viewGuest.country].filter(Boolean).join(", ")}
                    </span>
                  </div>
                </>
              )}

              {viewGuest.loyalty_tier && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-amber-600" />
                    <Badge variant="outline" className={`capitalize ${loyaltyColors[viewGuest.loyalty_tier] || ""}`}>
                      {viewGuest.loyalty_tier} Member
                    </Badge>
                  </div>
                </>
              )}

              {viewGuest.preferences && (
                <>
                  <Separator />
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Preferences</p>
                    <p className="text-sm">{viewGuest.preferences}</p>
                  </div>
                </>
              )}

              {viewGuest.notes && (
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Staff Notes</p>
                  <p className="text-sm text-muted-foreground italic">{viewGuest.notes}</p>
                </div>
              )}

              <Separator />
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold">Reservation History</p>
                </div>
                {loadingReservations ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : guestReservations.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">No reservations found</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {guestReservations.map((res) => (
                      <div key={res.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                        <div>
                          <span className="font-mono text-xs text-muted-foreground">{res.reservation_number}</span>
                          <p className="font-medium">
                            {new Date(res.check_in_date).toLocaleDateString()} - {new Date(res.check_out_date).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {res.adults} adult{res.adults !== 1 ? "s" : ""}
                            {res.children > 0 && `, ${res.children} child${res.children !== 1 ? "ren" : ""}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={res.status === "checked_out" ? "default" : res.status === "checked_in" ? "secondary" : "outline"} className="text-[10px]">
                            {res.status.replace(/_/g, " ")}
                          </Badge>
                          <p className="mt-0.5 font-semibold">${res.total_amount.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
