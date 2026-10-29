import { describe, it, expect } from 'vitest';
import { DayNightCycle, START_HOUR } from '../DayNightCycle';
import { TurnSystem, TIME_COST } from '../../core/TurnSystem';

describe('Reloj por turnos', () => {
  it('el tiempo solo avanza cuando hay una accion', () => {
    const clock = new DayNightCycle();
    const turns = new TurnSystem(clock);
    expect(clock.timeOfDay).toBe(START_HOUR);

    turns.advanceTurn('move');
    expect(turns.turnCount).toBe(2);
    expect(clock.timeOfDay).toBeCloseTo(START_HOUR + TIME_COST.move / 60);

    turns.advanceTurn('wait');
    expect(clock.timeOfDay).toBeCloseTo(START_HOUR + (TIME_COST.move + TIME_COST.wait) / 60);
  });

  it('la hora mostrada no pierde minutos por decimales', () => {
    const clock = new DayNightCycle();
    const turns = new TurnSystem(clock);
    expect(clock.getTimeString()).toBe('07:30');
    for (let i = 0; i < 4; i++) turns.advanceTurn('move');
    expect(clock.getTimeString()).toBe('08:10');
    clock.setTime(23.5);
    clock.advanceMinutes(30);
    expect(clock.getTimeString()).toBe('00:00'); // nunca "24:00"
    expect(clock.dayCount).toBe(2);
  });

  it('pasa de dia al cruzar la medianoche y cuenta los dias', () => {
    const clock = new DayNightCycle();
    clock.setTime(23.5, 1);
    clock.advanceMinutes(60);
    expect(clock.dayCount).toBe(2);
    expect(clock.timeOfDay).toBeCloseTo(0.5);
  });

  it('el dia y la noche cambian de fase y de oscuridad segun la hora', () => {
    const clock = new DayNightCycle();
    clock.setTime(12);
    expect(clock.getPhase()).toBe('day');
    expect(clock.getAmbientDarkness()).toBe(0);
    clock.setTime(23);
    expect(clock.isNight()).toBe(true);
    expect(clock.getAmbientDarkness()).toBeGreaterThan(0.8);
  });

  it('avisa al completar cada turno y puede reiniciarse', () => {
    const clock = new DayNightCycle();
    const turns = new TurnSystem(clock);
    const seen: number[] = [];
    turns.onTurnCompleted = (t) => seen.push(t);

    turns.advanceTurn('move');
    turns.advanceTurn('move');
    expect(seen).toEqual([2, 3]);

    turns.reset();
    expect(turns.turnCount).toBe(1);
  });

  it('los textos flotantes suben y desaparecen', () => {
    const turns = new TurnSystem(new DayNightCycle());
    turns.addFloatingText('+1', 10, 20);
    expect(turns.floatingTexts.length).toBe(1);
    turns.updateFloatingTexts(0.2);
    expect(turns.floatingTexts[0].y).toBeLessThan(20);
    turns.updateFloatingTexts(2);
    expect(turns.floatingTexts.length).toBe(0);
  });
});
