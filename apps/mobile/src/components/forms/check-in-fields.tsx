import Input from "@/components/input";
import { CHECK_IN_TITLE_MAX } from "@/utils/check-in-title";
import { minutesToIsoDuration } from "@/utils/duration";

export interface CheckInFieldValues {
  title: string;
  description: string;
  /** Minutos, como digitado */
  duration: string;
}

export type CheckInFieldErrors = Partial<
  Record<keyof CheckInFieldValues, string>
>;

/** Campos já validados, no formato da API (`null` = vazio). */
export interface ValidCheckInFields {
  title: string;
  description: string | null;
  duration: string | null;
}

/**
 * Valida título, descrição e duração como o back. Devolve os erros por campo
 * ou os valores prontos para enviar.
 */
export function validateCheckInFields(
  values: CheckInFieldValues,
):
  | { errors: CheckInFieldErrors; valid?: never }
  | { errors?: never; valid: ValidCheckInFields } {
  const title = values.title.trim();
  const description = values.description.trim();
  const duration = values.duration.trim();
  const errors: CheckInFieldErrors = {};

  if (!title) errors.title = "Informe o título do check-in.";
  else if (title.length > CHECK_IN_TITLE_MAX)
    errors.title = `Use no máximo ${CHECK_IN_TITLE_MAX} caracteres.`;

  if (description.length > 500)
    errors.description = "Use no máximo 500 caracteres.";

  if (duration && !/^\d+$/.test(duration))
    errors.duration = "Use apenas números inteiros.";
  else if (duration && Number(duration) <= 0)
    errors.duration = "A duração deve ser maior que zero.";

  if (Object.keys(errors).length > 0) return { errors };

  return {
    valid: {
      title,
      description: description || null,
      duration: duration ? minutesToIsoDuration(Number(duration)) : null,
    },
  };
}

export interface CheckInFieldsProps {
  values: CheckInFieldValues;
  errors: CheckInFieldErrors;
  onChange: (values: CheckInFieldValues) => void;
}

// Título, descrição e duração: os campos da criação e da edição de check-in
export function CheckInFields({
  values,
  errors,
  onChange,
}: CheckInFieldsProps) {
  const set = (field: keyof CheckInFieldValues) => (text: string) =>
    onChange({ ...values, [field]: text });

  return (
    <>
      <Input
        testID="check-in-title-input"
        label="Título"
        placeholder="ex: Treino de manhã"
        value={values.title}
        onChangeText={set("title")}
        autoCapitalize="sentences"
        maxLength={CHECK_IN_TITLE_MAX}
        error={errors.title}
      />

      <Input
        testID="check-in-description-input"
        label="Descrição (opcional)"
        placeholder="Como foi?"
        value={values.description}
        onChangeText={set("description")}
        autoCapitalize="sentences"
        multiline
        maxLength={500}
        error={errors.description}
      />

      <Input
        testID="check-in-duration-input"
        label="Duração em minutos (opcional)"
        placeholder="ex: 45"
        value={values.duration}
        onChangeText={set("duration")}
        keyboardType="number-pad"
        error={errors.duration}
      />
    </>
  );
}
