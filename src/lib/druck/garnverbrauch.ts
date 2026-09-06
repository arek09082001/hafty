/**
 * Geschätzter Garnverbrauch.
 *
 * Ein volles Kreuz zieht den Faden zweimal über die Diagonale des Kästchens
 * (je Seitenlänge mal Wurzel 2) und zweimal auf der Rückseite an der Kante
 * entlang (je eine Seitenlänge). Das sind
 *
 *     2 * √2 * s + 2 * s  ≈  4,83 * s
 *
 * bei einer Kästchenseite s. Dazu kommen etwa 15 % für Anfangs- und
 * Endfäden, Übergänge zwischen Flächen und das Stück, das beim Einfädeln
 * verloren geht.
 *
 * Auf Aida 14 ergibt das rund einen Meter je hundert Stiche – eine Zahl, die
 * sich mit den üblichen Faustregeln aus Stickbüchern deckt.
 *
 * Gerechnet wird für den Arbeitsfaden, also üblicherweise zwei der sechs
 * Fäden eines Stranges. Das steht auch so auf dem Ausdruck.
 */
export function garnlaengeMeter(stiche: number, stoffzaehlung: number): number {
  const seiteCm = 2.54 / stoffzaehlung;
  const proStichCm = (2 * Math.SQRT2 + 2) * seiteCm * 1.15;
  return (stiche * proStichCm) / 100;
}

/** Eine Länge in Metern für den Ausdruck aufbereiten. */
export function meterText(meter: number, landeskennung = "de-DE"): string {
  if (meter < 1) return `${Math.max(1, Math.round(meter * 100))} cm`;
  const zahl = meter.toLocaleString(landeskennung, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${zahl} m`;
}
