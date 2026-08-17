import { FacultySummerCampScreen } from "./FacultySummerCampScreen"

/** Students-group Campers surface — campers + inbox only (no Programs/Tracks). */
export function FacultyCampersScreen() {
  return <FacultySummerCampScreen initialTab="campers" visibleTabs={["campers", "requests"]} />
}
