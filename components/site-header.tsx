import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader({
  title,
  badge,
  description,
}: {
  title: string
  badge?: string
  description?: string
}) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
        {badge && (
          <Badge variant="outline" className="ml-1 text-xs">
            {badge}
          </Badge>
        )}
        {description && (
          <span className="ml-auto hidden text-xs text-muted-foreground sm:block">
            {description}
          </span>
        )}
      </div>
    </header>
  )
}
