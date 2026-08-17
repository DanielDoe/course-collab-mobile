import { useMemo, useState } from "react"
import { Platform, StyleSheet, Switch, Text, View } from "react-native"
import type { ModuleConfiguration } from "../../lib/instructor-content-api"
import { useModuleTheme } from "../../lib/themed-module-shell"
import {
  FACULTY_FLASHCARD_COLOR,
  facultyFlashcardSwitchTrack,
} from "../../lib/faculty-flashcard-theme"
import { FacultyAdminSection } from "./faculty-admin-ui"
import { FacultySearchToolbar } from "./faculty-module-shell"
import { FacultyEmptyState } from "./faculty-shared"

type ConfigTopic = ModuleConfiguration["topics"][number]

type Props = {
  config: ModuleConfiguration
  onToggle: (topicName: string, sessionCode: string, isAvailable: boolean) => Promise<void>
  disabled?: boolean
}

function formatUnitCount(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`
}

function formatTopicCounts(topic: ConfigTopic): string {
  if (topic.note_count != null) {
    return formatUnitCount(topic.note_count, "note")
  }
  return `${formatUnitCount(topic.deck_count ?? 0, "deck")} · ${formatUnitCount(topic.card_count ?? 0, "card")}`
}

export function FacultyFlashcardsTopicAvailabilitySection({ config, onToggle, disabled }: Props) {
  const { native, tokens, type } = useModuleTheme()
  const [search, setSearch] = useState("")
  const switchTrack = facultyFlashcardSwitchTrack(tokens)

  const sectionKeys = useMemo(() => {
    const seen = new Set<string>()
    const codes = config.sections
      .map((s) => s.code)
      .filter((code) => {
        if (seen.has(code)) return false
        seen.add(code)
        return true
      })
    return ["ALL", ...codes]
  }, [config.sections])

  const filteredTopics = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return config.topics
    return config.topics.filter((t) => t.name.toLowerCase().includes(q))
  }, [config.topics, search])

  return (
    <>
      <FacultySearchToolbar
        value={search}
        onChange={setSearch}
        placeholder="Search topics…"
        showFilter={false}
      />

      {config.topics.length === 0 ? (
        <FacultyEmptyState
          icon="folder-outline"
          title="No topics yet"
          body="Add decks with topics first — section access controls appear here."
        />
      ) : filteredTopics.length === 0 ? (
        <FacultyEmptyState icon="search-outline" title="No matches" body="Try a different search." />
      ) : (
        <View style={localStyles.topics}>
          {filteredTopics.map((topic) => (
            <TopicAvailabilityCard
              key={topic.name}
              topic={topic}
              sectionKeys={sectionKeys}
              sections={config.sections}
              switchTrack={switchTrack}
              native={native}
              type={type}
              tokens={tokens}
              disabled={disabled}
              onToggle={onToggle}
            />
          ))}
        </View>
      )}
    </>
  )
}

function TopicAvailabilityCard({
  topic,
  sectionKeys,
  sections,
  switchTrack,
  native,
  type,
  tokens,
  disabled,
  onToggle,
}: {
  topic: ConfigTopic
  sectionKeys: string[]
  sections: ModuleConfiguration["sections"]
  switchTrack: ReturnType<typeof facultyFlashcardSwitchTrack>
  native: ReturnType<typeof useModuleTheme>["native"]
  type: ReturnType<typeof useModuleTheme>["type"]
  tokens: ReturnType<typeof useModuleTheme>["tokens"]
  disabled?: boolean
  onToggle: (topicName: string, sessionCode: string, isAvailable: boolean) => Promise<void>
}) {
  return (
    <View
      style={[
        localStyles.card,
        tokens.cardShadow,
        { backgroundColor: native.secondaryGrouped, borderColor: tokens.border },
      ]}
    >
      <View style={[localStyles.cardHead, { borderBottomColor: native.separator }]}>
        <Text style={[type.bodyEmphasis, localStyles.topicName, { color: native.label }]} numberOfLines={2}>
          {topic.name}
        </Text>
        <Text style={[type.caption, { color: native.secondaryLabel }]}>
          {formatTopicCounts(topic)}
        </Text>
      </View>

      {sectionKeys.map((code, index) => {
        const avail = topic.availability?.[code]
        const enabled = avail?.is_available !== false
        const sectionMeta = sections.find((s) => s.code === code)
        const isAll = code === "ALL"
        const isLast = index === sectionKeys.length - 1

        return (
          <View
            key={`${topic.name}-${code}`}
            style={[
              localStyles.sectionRow,
              !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: native.separator },
              !enabled && { backgroundColor: native.fill },
            ]}
          >
            <View style={localStyles.sectionCopy}>
              <Text style={[type.body, { color: native.label }]}>{isAll ? "All sections" : code}</Text>
              <Text style={[type.caption, { color: native.secondaryLabel }]}>
                {isAll
                  ? "Course-wide default"
                  : sectionMeta
                    ? `${sectionMeta.studentCount} student${sectionMeta.studentCount === 1 ? "" : "s"}`
                    : "Section cohort"}
              </Text>
            </View>
            <Switch
              value={enabled}
              disabled={disabled}
              onValueChange={(next) => void onToggle(topic.name, code, next)}
              accessibilityLabel={`${topic.name} ${isAll ? "all sections" : code}`}
              trackColor={switchTrack}
              thumbColor={
                Platform.OS === "android"
                  ? enabled
                    ? FACULTY_FLASHCARD_COLOR.action
                    : native.switchAndroidThumbOff
                  : undefined
              }
              ios_backgroundColor={native.switchIosOffBackground}
            />
          </View>
        )
      })}
    </View>
  )
}

const localStyles = StyleSheet.create({
  topics: { gap: 12 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  cardHead: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  topicName: { lineHeight: 20 },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 52,
  },
  sectionCopy: { flex: 1, gap: 2 },
})
