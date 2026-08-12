import { StyleSheet, View } from "react-native"
import { Ionicons } from "@/components/icons/AppIcon"
import { FacultyHero } from "../faculty/faculty-shared"
import { FacultyStatCard, FacultyStatRow } from "../faculty/faculty-module-shell"

type Stat = { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }

type Props = {
  title: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
  gradient: [string, string]
  accent: string
  stats: Stat[]
}

export function AssessmentHero({ title, subtitle, icon, accent, stats }: Props) {
  return (
    <View style={styles.wrap}>
      <FacultyHero title={title} subtitle={subtitle} />
      <FacultyStatRow>
        {stats.map((stat) => (
          <FacultyStatCard
            key={stat.label}
            icon={stat.icon}
            iconBg={`${accent}18`}
            iconColor={accent}
            value={stat.value}
            label={stat.label}
          />
        ))}
      </FacultyStatRow>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: 12 }})
