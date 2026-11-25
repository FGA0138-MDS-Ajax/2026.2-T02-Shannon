import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Button from "@/components/button";
import Input from "@/components/input";
import { getErrorMessage } from "@/services/api-errors";
import { addMember } from "@/services/groups-api";

export interface AddMemberProps {
  groupId: string;
  onAdded: () => void;
}

// O admin adiciona pelo username; a API ignora maiúsculas e espaços nas pontas
export default function AddMember({ groupId, onAdded }: AddMemberProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!username.trim()) {
      setError("Digite o username de quem você quer adicionar.");
      return;
    }

    setAdding(true);
    try {
      await addMember(groupId, username);
      setUsername("");
      setError(undefined);
      onAdded();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={styles.container}>
      <Input
        testID="add-member-input"
        label="Adicionar pelo username"
        placeholder="ex: ana"
        value={username}
        onChangeText={(text) => {
          setUsername(text);
          setError(undefined);
        }}
        autoCorrect={false}
        maxLength={30}
        onSubmitEditing={handleAdd}
        error={error}
      />
      <Button
        variant="secondary"
        onPress={handleAdd}
        disabled={adding}
        style={styles.button}
      >
        {adding ? "Adicionando..." : "Adicionar"}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  button: {
    alignSelf: "flex-start",
    paddingHorizontal: 0,
    marginTop: -8,
  },
});
