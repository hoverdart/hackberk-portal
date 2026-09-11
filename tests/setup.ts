import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/**
 * Unmount between tests.
 *
 * Testing Library registers this itself only when Vitest runs with `globals`,
 * which this project does not. Without it every render stacks into the same
 * document, so the second test in a file that renders twice fails with "found
 * multiple elements" rather than with anything about the thing under test.
 */
afterEach(cleanup);
