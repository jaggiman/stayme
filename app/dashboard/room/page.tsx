import { redirect } from "next/navigation";

// /dashboard/room is now /dashboard/listings — permanent redirect
export default function RoomPageRedirect() {
  redirect("/dashboard/listings");
}
