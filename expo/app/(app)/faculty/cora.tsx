import { Redirect } from "expo-router"
import { FACULTY_CORA_ROUTE } from "../../../src/constants/faculty-nav"

/** Deep-link alias: coursecollab://faculty/cora → Faculty Cora module. */
export default function FacultyCoraDeepLinkAlias() {
  return <Redirect href={FACULTY_CORA_ROUTE} />
}
