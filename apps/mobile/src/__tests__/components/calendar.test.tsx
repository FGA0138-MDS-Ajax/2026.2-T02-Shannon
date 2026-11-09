import { fireEvent, render } from "@testing-library/react-native";
import Calendar from "@/components/calendar";

describe("Calendar component", () => {
  it("renders the specified month and year", async () => {
    const { getByText } = await render(<Calendar year={2022} month={9} />);

    expect(getByText("Setembro 2022")).toBeTruthy();
    expect(getByText("DOM")).toBeTruthy();
    expect(getByText("SEG")).toBeTruthy();
    expect(getByText("SÁB")).toBeTruthy();
  });

  it("renders days of the month and handles empty slots before day 1", async () => {
    // September 2022: 30 days, Sep 1 is Thursday
    const { getByTestId, queryByTestId } = await render(
      <Calendar year={2022} month={9} />,
    );

    expect(getByTestId("calendar-day-2022-09-01")).toBeTruthy();
    expect(getByTestId("calendar-day-2022-09-30")).toBeTruthy();
    expect(queryByTestId("calendar-day-2022-09-31")).toBeNull();
  });

  it("shows orange dot for days with check-in", async () => {
    const checkInDates = ["2022-09-08", "2022-09-15"];
    const { getByTestId, queryByTestId } = await render(
      <Calendar year={2022} month={9} checkInDates={checkInDates} />,
    );

    expect(getByTestId("check-in-dot-2022-09-08")).toBeTruthy();
    expect(getByTestId("check-in-dot-2022-09-15")).toBeTruthy();
    expect(queryByTestId("check-in-dot-2022-09-01")).toBeNull();
  });

  it("calls onSelectDate when a day is pressed", async () => {
    const onSelectDate = jest.fn();
    const { getByTestId } = await render(
      <Calendar year={2022} month={9} onSelectDate={onSelectDate} />,
    );

    fireEvent.press(getByTestId("calendar-day-2022-09-14"));
    expect(onSelectDate).toHaveBeenCalledWith("2022-09-14");
  });

  it("navigates to next and previous month", async () => {
    const onMonthChange = jest.fn();
    const { getByTestId, findByText } = await render(
      <Calendar year={2022} month={9} onMonthChange={onMonthChange} />,
    );

    fireEvent.press(getByTestId("calendar-next-month"));
    expect(await findByText("Outubro 2022")).toBeTruthy();
    expect(onMonthChange).toHaveBeenCalledWith(2022, 10);

    fireEvent.press(getByTestId("calendar-prev-month"));
    expect(await findByText("Setembro 2022")).toBeTruthy();
    expect(onMonthChange).toHaveBeenCalledWith(2022, 9);
  });

  it("wraps around year when navigating past December or before January", async () => {
    const onMonthChange = jest.fn();
    const { getByTestId, findByText } = await render(
      <Calendar year={2022} month={12} onMonthChange={onMonthChange} />,
    );

    fireEvent.press(getByTestId("calendar-next-month"));
    expect(await findByText("Janeiro 2023")).toBeTruthy();
    expect(onMonthChange).toHaveBeenCalledWith(2023, 1);

    fireEvent.press(getByTestId("calendar-prev-month"));
    expect(await findByText("Dezembro 2022")).toBeTruthy();
    expect(onMonthChange).toHaveBeenCalledWith(2022, 12);
  });
});
