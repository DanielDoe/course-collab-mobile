import { useCallback, useMemo, useState } from "react"
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Ionicons } from "@/components/icons/AppIcon"
import { ModuleScreen } from "../modules/ModuleScreen"
import { NATIVE } from "../../constants/faculty-native-theme"
import { hexToRgba } from "../../constants/app-themes"
import { useAppThemeTokens, useThemedNative } from "../../context/AppearanceProvider"
import { useNativeType } from "../../lib/themed-module-theme"
import { CORA_SOLVE_LABEL } from "../../lib/cora-constants"
import { CORA_SOLVE_CTA, CORA_SOLVE_THUMBS, coraSolveSourceSurface } from "../../lib/cora-solve-theme"
import { SolidListThumbTile } from "../theme/SolidListThumbTile"
import type { SolidListThumb } from "../../lib/solid-list-thumb"
import {
  buildCustomCoraProblem,
  buildImportedCoraProblem,
} from "../../lib/cora-problem"
import type { CoraImportedProblem } from "../../lib/cora-api"
import { useCora } from "../cora/CoraProvider"
import type { StudentSession } from "../../lib/session"
import { CoraImportCourseSheet } from "./CoraImportCourseSheet"
import { CoraImportedQuestionPreview } from "./CoraImportedQuestionPreview"
import { pickNoteImage, promptNoteImageSource } from "../../lib/note-image-insert"

type Props = {
  session: StudentSession
}

function SourceTile({
  label,
  subtitle,
  icon,
  thumb,
  active,
  onPress,
}: {
  label: string
  subtitle: string
  icon: keyof typeof Ionicons.glyphMap
  thumb: SolidListThumb
  active?: boolean
  onPress: () => void
}) {
  const native = useThemedNative()
  const tokens = useAppThemeTokens()
  const type = useNativeType()
  const surface = coraSolveSourceSurface(thumb.label, Boolean(active))

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.sourceTile,
        tokens.cardShadow,
        {
          backgroundColor: native.secondaryGrouped,
          borderColor: surface.border,
          borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
          opacity: pressed ? NATIVE.pressedOpacity : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <SolidListThumbTile thumb={thumb} icon={icon} size="compact" style={styles.sourceIconTile} />
      <Text style={[type.bodyEmphasis, styles.sourceTitle, { color: native.label }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[type.caption, { color: native.secondaryLabel }]} numberOfLines={2}>
        {subtitle}
      </Text>
      {active ? (
        <View style={[styles.sourceActiveBadge, { backgroundColor: surface.badgeBg }]}>
          <Ionicons name="checkmark-circle" size={12} color={thumb.label} />
          <Text style={[type.caption, { color: thumb.label, fontWeight: "600" }]}>Added</Text>
        </View>
      ) : (
        <Ionicons name="add-circle-outline" size={18} color={native.tertiaryLabel} style={styles.sourceAdd} />
      )}
    </Pressable>
  )
}

export function CoraSolveTab({ session }: Props) {
  const tokens = useAppThemeTokens()
  const native = useThemedNative()
  const type = useNativeType()
  const { openCora } = useCora()

  const [text, setText] = useState("")
  const [importOpen, setImportOpen] = useState(false)
  const [importedQuestion, setImportedQuestion] = useState<CoraImportedProblem | null>(null)
  const [importedLabel, setImportedLabel] = useState<string | null>(null)
  const [attachedPhotoUri, setAttachedPhotoUri] = useState<string | null>(null)
  const [attachingPhoto, setAttachingPhoto] = useState(false)

  const canSubmit = Boolean(importedQuestion || attachedPhotoUri || text.trim())

  const handleImport = useCallback((problem: CoraImportedProblem, label: string) => {
    setImportedQuestion(problem)
    setImportedLabel(label)
    setText("")
  }, [])

  const onPickPhoto = useCallback(() => {
    promptNoteImageSource((source) => {
      void (async () => {
        setAttachingPhoto(true)
        try {
          const file = await pickNoteImage(source)
          if (!file) return
          setAttachedPhotoUri(
            file.base64 ? `data:${file.mimeType};base64,${file.base64}` : file.uri,
          )
        } finally {
          setAttachingPhoto(false)
        }
      })()
    })
  }, [])

  const onSolve = useCallback(() => {
    if (!canSubmit) return

    if (importedQuestion) {
      openCora(
        buildImportedCoraProblem(importedQuestion, session.databaseId, importedLabel ?? undefined, {
          studentNotes: text.trim() || undefined,
        }),
      )
      return
    }

    openCora(
      buildCustomCoraProblem(
        "generic",
        text.trim() ||
          "Help me solve the problem in the attached photo. Walk me through it step by step.",
        session.databaseId,
        {
          title: attachedPhotoUri ? "Photo problem" : "Custom problem",
          mediaUrl: attachedPhotoUri,
        },
      ),
    )
  }, [
    attachedPhotoUri,
    canSubmit,
    importedLabel,
    importedQuestion,
    openCora,
    session.databaseId,
    text,
  ])

  const placeholder = useMemo(() => {
    if (importedQuestion) return "Where are you stuck? (optional)"
    if (attachedPhotoUri) return "Add context for the photo (optional)"
    return "Paste or type your problem…"
  }, [attachedPhotoUri, importedQuestion])

  const heroGradient = tokens.hero.gradientSoft

  return (
    <>
      <ModuleScreen contentStyle={styles.screenContent}>
        <View
          style={[
            styles.hero,
            tokens.cardShadow,
            { borderColor: native.separator },
          ]}
        >
          <LinearGradient
            colors={heroGradient}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            <View style={[styles.heroOrb, { backgroundColor: tokens.hero.bubbleA }]} pointerEvents="none" />
            <View style={[styles.heroOrbB, { backgroundColor: tokens.hero.bubbleB }]} pointerEvents="none" />
            <SolidListThumbTile
              thumb={CORA_SOLVE_THUMBS.hero}
              icon="extension-puzzle-outline"
              size="compact"
              style={styles.heroIconTile}
            />
            <View style={styles.heroCopy}>
              <Text style={[type.bodyEmphasis, styles.heroTitle, { color: native.label }]}>
                Step-by-step solutions
              </Text>
              <Text style={[type.caption, { color: native.secondaryLabel, lineHeight: 18 }]}>
                Import a course question, snap a photo, or type — Cora walks you through every step.
              </Text>
            </View>
          </LinearGradient>
        </View>

        <Text style={[type.caption, styles.sectionLabel, { color: native.secondaryLabel }]}>Add your problem</Text>
        <View style={styles.sourceRow}>
          <SourceTile
            label="Import"
            subtitle="Quiz, homework, or lecture"
            icon="school-outline"
            thumb={CORA_SOLVE_THUMBS.import}
            active={Boolean(importedQuestion)}
            onPress={() => setImportOpen(true)}
          />
          <SourceTile
            label={attachedPhotoUri ? "Photo" : "Camera"}
            subtitle={attachingPhoto ? "Opening…" : "Worksheet or diagram"}
            icon="camera-outline"
            thumb={CORA_SOLVE_THUMBS.camera}
            active={Boolean(attachedPhotoUri)}
            onPress={onPickPhoto}
          />
        </View>

        <View
          style={[
            styles.composerCard,
            tokens.cardShadow,
            { backgroundColor: native.secondaryGrouped, borderColor: native.separator },
          ]}
        >
          <View style={styles.composerHeader}>
            <SolidListThumbTile
              thumb={CORA_SOLVE_THUMBS.workspace}
              icon="create-outline"
              size="compact"
              style={styles.composerHeaderIconTile}
            />
            <Text style={[type.caption, styles.composerHeaderLabel, { color: native.secondaryLabel }]}>
              Problem workspace
            </Text>
          </View>

          {importedQuestion ? (
            <View style={styles.composerInset}>
              <CoraImportedQuestionPreview
                label={importedLabel ?? undefined}
                problem={importedQuestion}
                compact
                onClear={() => {
                  setImportedQuestion(null)
                  setImportedLabel(null)
                }}
              />
            </View>
          ) : null}

          {attachedPhotoUri ? (
            <View style={[styles.composerInset, styles.photoBox]}>
              <Image source={{ uri: attachedPhotoUri }} style={styles.photo} resizeMode="cover" />
              <Pressable
                onPress={() => setAttachedPhotoUri(null)}
                style={[styles.photoRemove, { backgroundColor: hexToRgba("#000", 0.55) }]}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
              >
                <Ionicons name="close" size={16} color="#ffffff" />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.inputWrap}>
            <TextInput
              style={[
                styles.input,
                importedQuestion ? styles.inputNotes : null,
                {
                  color: native.label,
                  backgroundColor: tokens.isDark ? hexToRgba("#ffffff", 0.06) : native.groupedBackground,
                  borderColor: native.separator,
                },
              ]}
              value={text}
              onChangeText={setText}
              placeholder={placeholder}
              placeholderTextColor={native.secondaryLabel}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        <Pressable
          onPress={onSolve}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.cta,
            tokens.cardShadow,
            {
              backgroundColor: canSubmit ? CORA_SOLVE_CTA : native.fill,
              opacity: !canSubmit ? 0.72 : pressed ? NATIVE.pressedOpacity : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={CORA_SOLVE_LABEL}
        >
          <Ionicons
            name="sparkles"
            size={18}
            color={canSubmit ? "#ffffff" : native.secondaryLabel}
          />
          <Text style={[styles.ctaText, { color: canSubmit ? "#ffffff" : native.secondaryLabel }]}>
            {CORA_SOLVE_LABEL}
          </Text>
        </Pressable>
      </ModuleScreen>

      <CoraImportCourseSheet
        visible={importOpen}
        session={session}
        onClose={() => setImportOpen(false)}
        onImportProblem={handleImport}
      />
    </>
  )
}

const styles = StyleSheet.create({
  screenContent: {
    paddingTop: NATIVE.pagePadding,
    paddingBottom: 28,
    gap: 14,
  },
  hero: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  heroGradient: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    overflow: "hidden",
  },
  heroOrb: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    top: -40,
    right: -20,
  },
  heroOrbB: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    bottom: -18,
    left: -12,
  },
  heroIconTile: {
    width: 44,
    height: 44,
    borderRadius: 13,
    flexShrink: 0,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  heroTitle: {
    fontSize: 17,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    paddingHorizontal: 2,
    marginTop: 2,
  },
  sourceRow: {
    flexDirection: "row",
    gap: 10,
  },
  sourceTile: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    minHeight: 132,
    gap: 6,
  },
  sourceIconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  sourceTitle: {
    fontSize: 15,
    marginTop: 2,
  },
  sourceAdd: {
    marginTop: "auto",
    alignSelf: "flex-end",
  },
  sourceActiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: "auto",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  composerCard: {
    borderRadius: NATIVE.sectionRadius,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  composerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  composerHeaderIconTile: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  composerHeaderLabel: {
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  composerInset: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 4,
  },
  photoBox: {
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  photo: {
    width: "100%",
    height: 148,
    backgroundColor: "#e5e7eb",
  },
  photoRemove: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  inputWrap: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 14,
  },
  input: {
    minHeight: 128,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 22,
  },
  inputNotes: {
    minHeight: 72,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 15,
    marginTop: 4,
    ...(Platform.OS === "android" ? { elevation: 3 } : {}),
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "600",
  },
})
