import { redirect } from "next/navigation"

export default function PeopleIndexPage() {
  // Keep People root aligned with the primary People > Drivers destination
  redirect("/dashboard/people/drivers")
}
