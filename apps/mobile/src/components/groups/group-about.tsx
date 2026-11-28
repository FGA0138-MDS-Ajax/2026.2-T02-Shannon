import { StyleSheet } from "react-native";
import { Section } from "@/components/ui";
import type { GroupDetail } from "@/services/types/groups";
import GroupMembers from "./group-members";
import InviteCard from "./invite-card";

export interface GroupAboutProps {
  group: GroupDetail;
  colorOf: (userId: string) => string;
  onChanged: () => void;
}

/**
 * Folha da aba Sobre: o convite (só admin) e quem está no grupo. A descrição
 * e os números ficam no cabeçalho.
 */
export default function GroupAbout({
  group,
  colorOf,
  onChanged,
}: GroupAboutProps) {
  // Só admin recebe o código; grupo encerrado não aceita gente nova
  const inviteCode =
    group.my_role === "admin" && group.status === "active"
      ? group.invite_code
      : null;
  return (
    <>
      {inviteCode && (
        <Section style={styles.first} title="Convite">
          <InviteCard
            groupId={group.id}
            groupName={group.name}
            code={inviteCode}
            onRegenerated={onChanged}
          />
        </Section>
      )}

      <Section
        style={!inviteCode && styles.first}
        title="Integrantes"
        count={group.members_count}
      >
        <GroupMembers group={group} colorOf={colorOf} onChanged={onChanged} />
      </Section>
    </>
  );
}

const styles = StyleSheet.create({
  // A folha já tem margem em cima
  first: {
    marginTop: 0,
  },
});
