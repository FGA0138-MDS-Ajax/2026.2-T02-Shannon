import { fireEvent, render } from "@testing-library/react-native";
import { GroupForm } from "@/components/forms/group-form";
import { ApiError } from "@/services/api";
import type { GroupFormValues } from "@/components/forms/group-form";

type Screen = Awaited<ReturnType<typeof render>>;

async function renderForm(
  onSubmit: (values: GroupFormValues) => Promise<void>,
  initialValues?: Partial<GroupFormValues>,
): Promise<Screen> {
  return render(
    <GroupForm
      submitLabel="Criar grupo"
      submittingLabel="Criando..."
      initialValues={initialValues}
      onSubmit={onSubmit}
    />,
  );
}

async function typeName(screen: Screen, text: string) {
  await fireEvent.changeText(screen.getByTestId("group-name-input"), text);
}

async function submit(screen: Screen) {
  await fireEvent.press(screen.getByTestId("group-submit-button"));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GroupForm validação local", () => {
  it("nome é obrigatório (1 a 100 caracteres)", async () => {
    const onSubmit = jest.fn(async () => {});
    const screen = await renderForm(onSubmit);

    await submit(screen);
    expect(await screen.findByText("Informe o nome do grupo.")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await typeName(screen, "a".repeat(101));
    await submit(screen);
    expect(screen.getByText("Use no máximo 100 caracteres.")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await typeName(screen, "Corrida matinal");
    await submit(screen);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Corrida matinal" }),
    );
  });

  it("aceita nome com exatamente 100 caracteres", async () => {
    const onSubmit = jest.fn(async () => {});
    const screen = await renderForm(onSubmit);

    await typeName(screen, "a".repeat(100));
    await submit(screen);

    expect(onSubmit).toHaveBeenCalled();
  });

  it("descrição é opcional e tem no máximo 500 caracteres", async () => {
    const onSubmit = jest.fn(async () => {});
    const screen = await renderForm(onSubmit);

    await typeName(screen, "Grupo");
    await fireEvent.changeText(screen.getByTestId("group-description-input"), "b".repeat(501));
    await submit(screen);

    expect(screen.getByText("Use no máximo 500 caracteres.")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await fireEvent.changeText(screen.getByTestId("group-description-input"), "");
    await submit(screen);

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ description: null }));
  });

  it("data de término é opcional e não pode ser anterior a hoje", async () => {
    const onSubmit = jest.fn(async () => {});
    const screen = await renderForm(onSubmit, { name: "Grupo", ends_on: "2020-01-01" });

    await submit(screen);

    expect(
      screen.getByText("A data de término não pode ser anterior à data atual."),
    ).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("critério do ranking só aceita check_ins ou goals", async () => {
    const onSubmit = jest.fn(async () => {});
    const screen = await renderForm(onSubmit);

    expect(screen.getByTestId("criterion-check_ins")).toBeTruthy();
    expect(screen.getByTestId("criterion-goals")).toBeTruthy();
    expect(screen.queryByTestId("criterion-other")).toBeNull();

    await typeName(screen, "Grupo");
    await fireEvent.press(screen.getByTestId("criterion-goals"));
    await submit(screen);

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ ranking_criterion: "goals" }));
  });

  it("envia os campos no formato da API", async () => {
    const onSubmit = jest.fn(async () => {});
    const screen = await renderForm(onSubmit);

    await typeName(screen, "Corrida");
    await fireEvent.changeText(screen.getByTestId("group-description-input"), "Juntos");
    await fireEvent.press(screen.getByTestId("criterion-goals"));
    await submit(screen);

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Corrida",
      description: "Juntos",
      ends_on: null,
      ranking_criterion: "goals",
    });
  });
});

describe("GroupForm erros 422 da API", () => {
  it("erro 422 com lista de campos posiciona no campo correto (getFieldErrors)", async () => {
    const onSubmit = jest.fn(async () => {
      throw new ApiError("Unprocessable", 422, {
        detail: [
          { loc: ["body", "name"], msg: "Nome já existe.", type: "value_error" },
          {
            loc: ["body", "ends_on"],
            msg: "A data de término deve ser igual ou posterior à data de hoje.",
            type: "value_error",
          },
        ],
      });
    });
    const screen = await renderForm(onSubmit);

    await typeName(screen, "Grupo");
    await submit(screen);

    expect(await screen.findByText("Nome já existe.")).toBeTruthy();
    expect(
      screen.getByText("A data de término deve ser igual ou posterior à data de hoje."),
    ).toBeTruthy();
  });

  it("erro 422 em texto na data de fim usa getErrorMessage no campo", async () => {
    const message = "A data de término deve ser igual ou posterior à data de hoje.";
    const onSubmit = jest.fn(async () => {
      throw new ApiError(message, 422, { detail: message });
    });
    const screen = await renderForm(onSubmit);

    await typeName(screen, "Grupo");
    await submit(screen);

    expect(await screen.findByText(message)).toBeTruthy();
  });
});
