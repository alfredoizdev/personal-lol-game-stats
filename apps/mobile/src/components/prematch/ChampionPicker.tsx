import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { ChampionPortrait } from "@/components/ChampionPortrait";
import type { ChampionEntry } from "@/lib/champions";
import { colors, font, radius, space } from "@/theme/tokens";

type Item = { entry: ChampionEntry; games: number };

/**
 * Full Data Dragon list with search; the champions you played in this role
 * come first with their game counts (spec 2.2).
 */
export function ChampionPicker({
  champions,
  played,
  selected,
  onSelect,
}: {
  champions: ChampionEntry[];
  played: Array<{ championId: number; games: number }>;
  selected: ChampionEntry | null;
  onSelect: (c: ChampionEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const items = useMemo<Item[]>(() => {
    const games = new Map(played.map((p) => [p.championId, p.games]));
    const q = query.trim().toLowerCase();
    const list = champions
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .map((entry) => ({ entry, games: games.get(entry.id) ?? 0 }));
    return list.sort(
      (a, b) => b.games - a.games || a.entry.name.localeCompare(b.entry.name),
    );
  }, [champions, played, query]);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={styles.field}
      >
        {selected ? (
          <ChampionPortrait championName={selected.imageKey} size={40} />
        ) : (
          <View style={styles.placeholder} />
        )}
        <View style={styles.fieldText}>
          <Text style={styles.fieldLabel} maxFontSizeMultiplier={1.15}>
            Champion
          </Text>
          <Text style={styles.fieldValue} maxFontSizeMultiplier={1.15}>
            {selected
              ? selected.name
              : champions.length
                ? "Choose a champion"
                : "Loading champions…"}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
        onDismiss={() => setQuery("")}
      >
        <SafeAreaProvider>
          <SafeAreaView
            style={styles.modal}
            edges={["top", "left", "right", "bottom"]}
          >
            <View style={styles.modalHeader}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search champion"
                placeholderTextColor={colors.muted}
                autoCorrect={false}
                autoCapitalize="none"
                style={styles.search}
                accessibilityLabel="Search champion"
              />
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text style={styles.close}>Close</Text>
              </Pressable>
            </View>
            <FlatList
              data={items}
              keyExtractor={(i) => String(i.entry.id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item, index }) => (
                <>
                  {index === 0 && item.games > 0 ? (
                    <Text style={styles.section}>
                      Your champions in this role
                    </Text>
                  ) : null}
                  {item.games === 0 &&
                  (index === 0 || items[index - 1]!.games > 0) ? (
                    <Text style={styles.section}>All champions</Text>
                  ) : null}
                  <Pressable
                    onPress={() => {
                      onSelect(item.entry);
                      setOpen(false);
                      setQuery("");
                    }}
                    accessibilityRole="button"
                    style={styles.item}
                  >
                    <ChampionPortrait
                      championName={item.entry.imageKey}
                      size={36}
                    />
                    <Text style={styles.itemName} maxFontSizeMultiplier={1.15}>
                      {item.entry.name}
                    </Text>
                    {item.games > 0 ? (
                      <Text style={styles.itemGames}>
                        {item.games} {item.games === 1 ? "game" : "games"}
                      </Text>
                    ) : null}
                  </Pressable>
                </>
              )}
            />
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.control,
    padding: 10,
  },
  placeholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSolid,
  },
  fieldText: { flex: 1 },
  fieldLabel: {
    color: colors.muted,
    fontSize: font.caption - 1,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  fieldValue: { color: colors.text, fontSize: font.body, fontWeight: "700" },
  chevron: { color: colors.muted, fontSize: 24 },
  modal: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    padding: space.md,
    paddingTop: space.lg,
  },
  search: {
    flex: 1,
    color: colors.text,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.control,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: font.body,
  },
  close: { color: colors.accent, fontSize: font.body, fontWeight: "700" },
  section: {
    color: colors.muted,
    fontSize: font.caption,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: 8,
  },
  itemName: { color: colors.text, fontSize: font.body, flex: 1 },
  itemGames: { color: colors.muted, fontSize: font.caption },
});
