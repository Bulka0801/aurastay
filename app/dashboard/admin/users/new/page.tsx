import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NewUserForm } from "@/components/admin/new-user-form"

export default function NewUserPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Додати нового користувача</h1>
        <p className="text-muted-foreground">Створіть новий обліковий запис користувача для системи</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Інформація про користувача</CardTitle>
        </CardHeader>
        <CardContent>
          <NewUserForm />
        </CardContent>
      </Card>
    </div>
  )
}
