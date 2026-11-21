/** Machine-readable reason for a {@link UseWeatherError}. */
export type UseWeatherErrorCode = "ENVIRONMENT" | "INVALID_CONTAINER";

/** Error thrown by useweather for genuine misuse. Check it with {@link isUseWeatherError}. */
export type UseWeatherError = Error & {
  readonly name: "UseWeatherError";
  readonly code: UseWeatherErrorCode;
};

/** @internal */
export const createUseWeatherError = (
  code: UseWeatherErrorCode,
  message: string,
): UseWeatherError =>
  Object.assign(new Error(message), {
    code,
    name: "UseWeatherError" as const,
  });

/**
 * Type guard for errors thrown by useweather.
 *
 * @example
 * try { createWeatherScene(el) } catch (e) { if (isUseWeatherError(e)) console.warn(e.code) }
 */
export const isUseWeatherError = (error: unknown): error is UseWeatherError =>
  error instanceof Error &&
  error.name === "UseWeatherError" &&
  typeof (
    error as {
      code?: unknown;
    }
  ).code === "string";
