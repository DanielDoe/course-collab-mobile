import { useMemo } from "react"
import { getSummerWebPath } from "../../constants/summer-web-paths"
import { SUMMER_NAV_GROUP, SUMMER_CAMP_INFO_ITEMS, SUMMER_NAV_LABEL_BY_ROUTE } from "../../constants/summer-nav"
import { WebModuleScreen } from "../modules/WebModuleScreen"

type Props = { moduleId: string }

export function SummerWebModuleScreen({ moduleId }: Props) {
  const webPath = getSummerWebPath(moduleId)
  const title =
    SUMMER_NAV_GROUP.items.find((item) => item.id === moduleId)?.label ??
    SUMMER_CAMP_INFO_ITEMS.find((item) => item.id === moduleId)?.label ??
    SUMMER_NAV_LABEL_BY_ROUTE[`/module/${moduleId}`] ??
    moduleId

  return <WebModuleScreen webPath={webPath} title={title} immersive summerPortal />
}
