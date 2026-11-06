import { useEffect, useMemo, useState } from "react"
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native"
import { hexToRgba } from "../../constants/app-themes"
import { Ionicons } from "@/components/icons/AppIcon"
import { ApiError, api, type UniversityRecord } from "../../lib/api"
import { AuthFlowEnterItem } from "../motion/AuthFlowPanelTransition"
import { PressableScale } from "../motion/PressableScale"
import { ErrorBanner } from "./LoginCard"
import { LoginButton } from "./LoginButton"
import { UniversityAuthLogoImage } from "./UniversityAuthLogoImage"
import { LoginBackLink, LoginPortalStack } from "./login-chrome"
import { useLoginTheme } from "./login-theme"

function isOtherUniversity(uni: Pick<UniversityRecord, "short_name"> | null | undefined): boolean {
  return String(uni?.short_name ?? "").trim().toUpperCase() === "OTHER"
}

function sameUniversity(a: UniversityRecord | null, b: UniversityRecord): boolean {
  if (!a) return false
  if (a.id && b.id) return a.id === b.id
  return a.short_name === b.short_name && a.name === b.name
}

type Props = {
  selectedUniversity: UniversityRecord | null
  onSelect: (university: UniversityRecord) => void
  onContinue: (university: UniversityRecord) => void | Promise<void>
  onBack?: () => void
  title?: string
  description?: string
}

export function LoginUniversityPicker({
  selectedUniversity,
  onSelect,
  onContinue,
  onBack,
  title = "Choose Your University",
  description = "Search thousands of schools, or pick Other if yours is not listed.",
}: Props) {
  const { LOGIN, loginType } = useLoginTheme()
  const linkAccent = LOGIN.purple

  const [universities, setUniversities] = useState<UniversityRecord[]>([])
  const [loadingUniversities, setLoadingUniversities] = useState(true)
  const [uniQuery, setUniQuery] = useState("")
  const [uniResults, setUniResults] = useState<UniversityRecord[]>([])
  const [searchingUniversities, setSearchingUniversities] = useState(false)
  const [savingUniversity, setSavingUniversity] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let mounted = true
    void (async () => {
      try {
        const uniData = await api.getUniversities()
        if (!mounted) return
        setUniversities(uniData.universities ?? [])
      } catch (err) {
        if (!mounted) return
        setError(err instanceof ApiError ? err.message : "Failed to load universities.")
      } finally {
        if (mounted) setLoadingUniversities(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const q = uniQuery.trim()
    if (q.length < 2) {
      setUniResults([])
      setSearchingUniversities(false)
      return
    }
    const handle = setTimeout(() => {
      void (async () => {
        setSearchingUniversities(true)
        try {
          const data = await api.searchUniversities(q)
          setUniResults(data.universities ?? [])
        } catch {
          setUniResults([])
        } finally {
          setSearchingUniversities(false)
        }
      })()
    }, 280)
    return () => clearTimeout(handle)
  }, [uniQuery])

  const featuredUniversities = useMemo(
    () => universities.filter((u) => !isOtherUniversity(u)),
    [universities],
  )
  const otherUniversity = useMemo(
    () => universities.find((u) => isOtherUniversity(u)) ?? null,
    [universities],
  )
  const showingUniversitySearch = uniQuery.trim().length >= 2

  async function handleContinue() {
    if (!selectedUniversity) {
      setError("Select your university to continue.")
      return
    }
    setError("")
    let university = selectedUniversity
    if (!university.id) {
      setSavingUniversity(true)
      try {
        const data = await api.ensureUniversity({
          name: university.name,
          domain: university.domain,
          shortName: university.short_name,
        })
        university = data.university
        onSelect(university)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not save your school. Try again.")
        setSavingUniversity(false)
        return
      }
      setSavingUniversity(false)
    }
    await onContinue(university)
  }

  return (
    <LoginPortalStack>
      <AuthFlowEnterItem index={0}>
        <View style={styles.stepHeader}>
          <Text style={loginType.panelTitle}>{title}</Text>
          <Text style={loginType.panelDescription}>{description}</Text>
        </View>
      </AuthFlowEnterItem>

      {loadingUniversities ? (
        <AuthFlowEnterItem index={1}>
          <View style={styles.loadingBox}>
            <ActivityIndicator color={linkAccent} />
          </View>
        </AuthFlowEnterItem>
      ) : (
        <>
          <AuthFlowEnterItem index={1}>
            <View
              style={[
                styles.searchBox,
                { borderColor: LOGIN.separator, backgroundColor: LOGIN.grouped },
              ]}
            >
              <Ionicons name="search" size={17} color={LOGIN.secondaryLabel} />
              <TextInput
                value={uniQuery}
                onChangeText={setUniQuery}
                placeholder="Search universities…"
                placeholderTextColor={LOGIN.secondaryLabel}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.searchInput, { color: LOGIN.label }]}
              />
              {searchingUniversities ? (
                <ActivityIndicator size="small" color={linkAccent} />
              ) : uniQuery ? (
                <PressableScale
                  onPress={() => setUniQuery("")}
                  hitSlop={8}
                  haptic="selection"
                  accessibilityLabel="Clear search"
                >
                  <Ionicons name="close-circle" size={17} color={LOGIN.secondaryLabel} />
                </PressableScale>
              ) : null}
            </View>
          </AuthFlowEnterItem>

          <View style={styles.uniList}>
            {showingUniversitySearch && uniResults.length === 0 && !searchingUniversities ? (
              <AuthFlowEnterItem index={2}>
                <Text
                  style={[
                    loginType.info,
                    { color: LOGIN.secondaryLabel, textAlign: "center", paddingVertical: 10 },
                  ]}
                >
                  No matches. Choose Other below.
                </Text>
              </AuthFlowEnterItem>
            ) : null}
            {(showingUniversitySearch ? uniResults : featuredUniversities).map((uni, rowIndex) => {
              const active = sameUniversity(selectedUniversity, uni)
              const enterIndex = 2 + rowIndex
              return (
                <AuthFlowEnterItem key={`${uni.id}-${uni.domain ?? uni.name}`} index={enterIndex}>
                  <PressableScale
                    onPress={() => {
                      onSelect(uni)
                      setError("")
                    }}
                    haptic="selection"
                    style={[
                      styles.uniRow,
                      {
                        borderColor: active ? uni.primary_color : LOGIN.separator,
                        backgroundColor: active ? hexToRgba(uni.primary_color, 0.1) : LOGIN.grouped,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={uni.short_name ? `${uni.short_name} campus` : uni.name}
                    accessibilityState={{ selected: active }}
                    testID={uni.short_name ? `login-university-${uni.short_name}` : undefined}
                  >
                    <UniversityAuthLogoImage university={uni} variant="list" />
                    <View style={styles.uniText}>
                      <Text style={[loginType.stepLabel, { color: LOGIN.label }]} numberOfLines={1}>
                        {uni.name}
                      </Text>
                      <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>
                        {uni.short_name}
                        {uni.domain ? ` · ${uni.domain}` : ""}
                      </Text>
                    </View>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={22} color={uni.primary_color} />
                    ) : (
                      <Ionicons name="chevron-forward" size={18} color={LOGIN.secondaryLabel} />
                    )}
                  </PressableScale>
                </AuthFlowEnterItem>
              )
            })}
            {otherUniversity ? (
              (() => {
                const active = Boolean(selectedUniversity && isOtherUniversity(selectedUniversity))
                const enterIndex =
                  2 + (showingUniversitySearch ? uniResults : featuredUniversities).length
                return (
                  <AuthFlowEnterItem key="other-university" index={enterIndex}>
                    <PressableScale
                      onPress={() => {
                        onSelect(otherUniversity)
                        setError("")
                      }}
                      haptic="selection"
                      style={[
                        styles.uniRow,
                        {
                          borderColor: active ? otherUniversity.primary_color : LOGIN.separator,
                          backgroundColor: active
                            ? hexToRgba(otherUniversity.primary_color, 0.1)
                            : LOGIN.grouped,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <UniversityAuthLogoImage university={otherUniversity} variant="list" />
                      <View style={styles.uniText}>
                        <Text style={[loginType.stepLabel, { color: LOGIN.label }]} numberOfLines={1}>
                          {otherUniversity.name}
                        </Text>
                        <Text style={[loginType.info, { color: LOGIN.secondaryLabel }]}>
                          Independent, company, or school not listed
                        </Text>
                      </View>
                      {active ? (
                        <Ionicons name="checkmark-circle" size={22} color={otherUniversity.primary_color} />
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color={LOGIN.secondaryLabel} />
                      )}
                    </PressableScale>
                  </AuthFlowEnterItem>
                )
              })()
            ) : null}
          </View>
        </>
      )}

      {error ? (
        <AuthFlowEnterItem index={8}>
          <ErrorBanner message={error} />
        </AuthFlowEnterItem>
      ) : null}

      <AuthFlowEnterItem index={9}>
        <LoginButton
          label={savingUniversity ? "Saving…" : "Continue"}
          icon="arrow-forward"
          onPress={() => void handleContinue()}
          disabled={!selectedUniversity || loadingUniversities || savingUniversity}
        />
      </AuthFlowEnterItem>

      {onBack ? (
        <AuthFlowEnterItem index={10}>
          <LoginBackLink label="Other sign-in options" onPress={onBack} />
        </AuthFlowEnterItem>
      ) : null}
    </LoginPortalStack>
  )
}

const styles = StyleSheet.create({
  stepHeader: { gap: 6, marginBottom: 2 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth * 2,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  loadingBox: { paddingVertical: 36, alignItems: "center" },
  uniList: { gap: 10 },
  uniRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  uniText: { flex: 1, gap: 2, minWidth: 0 },
})
