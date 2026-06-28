import { redirect } from "next/navigation"

export default function PropBuildingDetailRedirect({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  // Redirect to buildings directory — individual building URLs not preserved
  // since nc_buildings uses different slugs
  redirect("/terminal/buildings")
}
