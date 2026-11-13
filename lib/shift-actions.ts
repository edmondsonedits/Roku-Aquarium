export async function requestShiftChange(
  accepting: boolean,
  confirm: (message: string) => boolean,
  control: (body: {action: 'start' | 'end'}) => Promise<void>,
): Promise<void> {
  if (accepting && !confirm('End this shift? This will stop accepting new fish and remove all swimming fish from the display. Every fish stays saved for next time.')) return;
  await control({action: accepting ? 'end' : 'start'});
}
