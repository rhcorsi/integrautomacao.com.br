import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CONFIRMATION_RESPONSE_MAX_BYTES,
  classifyConfirmationHttpResponse,
  createNewsletterConfirmationController,
  createNewsletterConfirmationRenderer,
  postNewsletterConfirmation,
  type ConfirmationElementPort,
  type ConfirmationPostResult,
  type ConfirmationRenderElements,
  type ConfirmationUiState,
  type NewsletterConfirmationDependencies,
} from "../src/scripts/newsletterConfirmation";

const NETWORK_BLOCK_MESSAGE = "B6_TEST_NETWORK_BLOCKED";
const VALID_TOKEN = "a".repeat(43);
const CONFIRMATION_PATH = "/integra-acao/newsletter/confirmar/";

let globalFetchSpy: ReturnType<typeof vi.spyOn>;
let networkSentinelTest = false;
let consoleSpies: Array<ReturnType<typeof vi.spyOn>> = [];

beforeEach(() => {
  networkSentinelTest = false;
  globalFetchSpy = vi
    .spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error(NETWORK_BLOCK_MESSAGE));
  consoleSpies = (["debug", "error", "info", "log", "warn"] as const).map(
    (method) => vi.spyOn(console, method).mockImplementation(() => undefined),
  );
});

afterEach(() => {
  if (!networkSentinelTest) expect(globalFetchSpy).not.toHaveBeenCalled();
  for (const spy of consoleSpies) expect(spy).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

function createControllerHarness(
  overrides: Partial<NewsletterConfirmationDependencies> = {},
) {
  const renders: ConfirmationUiState[] = [];
  const effects: string[] = [];
  const postConfirmation = vi.fn(async (): Promise<{ state: string }> => ({
    state: "confirmed",
  }));
  const dependencies: NewsletterConfirmationDependencies = {
    readFragment: vi.fn(() => `#token=${VALID_TOKEN}`),
    currentPath: vi.fn(() => CONFIRMATION_PATH),
    replaceUrl: vi.fn(() => {
      effects.push("replace");
    }),
    postConfirmation,
    render: vi.fn((state) => {
      effects.push(`render:${state.state}`);
      renders.push(state);
    }),
    ...overrides,
  };

  return {
    controller: createNewsletterConfirmationController(dependencies),
    dependencies,
    effects,
    postConfirmation,
    renders,
  };
}

function recursivelyCollectStrings(value: unknown, output: string[] = []) {
  if (typeof value === "string") output.push(value);
  if (Array.isArray(value)) {
    for (const item of value) recursivelyCollectStrings(item, output);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      recursivelyCollectStrings(item, output);
    }
  }
  return output;
}

function jsonResponse(body: string, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }
  return new Response(body, { ...init, headers });
}

function createHttpDependencies(response: Response) {
  const signal = new AbortController().signal;
  return {
    request: vi.fn(async () => response),
    signal,
    timeoutSignal: vi.fn(() => signal),
  };
}

function makeConfirmedJsonOfSize(size: number) {
  const prefix = '{"ok":true,"state":"confirmed","padding":"';
  const suffix = '"}';
  const paddingLength = size - prefix.length - suffix.length;
  if (paddingLength < 0) throw new Error("requested JSON size is too small");
  const result = `${prefix}${"x".repeat(paddingLength)}${suffix}`;
  expect(new TextEncoder().encode(result)).toHaveLength(size);
  return result;
}

function trackedResponse(input: {
  chunks: Uint8Array[];
  headers?: HeadersInit;
  status?: number;
}) {
  let index = 0;
  const readerCancel = vi.fn(async () => undefined);
  const bodyCancel = vi.fn(async () => undefined);
  const read = vi.fn(async () => {
    const value = input.chunks[index++];
    return value
      ? ({ done: false, value } as ReadableStreamReadResult<Uint8Array>)
      : ({ done: true, value: undefined } as ReadableStreamReadResult<Uint8Array>);
  });
  const getReader = vi.fn(() => ({ read, cancel: readerCancel }));
  const body = { cancel: bodyCancel, getReader } as unknown as ReadableStream<Uint8Array>;
  const headers = new Headers({ "Content-Type": "application/json", ...input.headers });
  const response = {
    body,
    headers,
    status: input.status ?? 200,
  } as Response;
  return { bodyCancel, getReader, read, readerCancel, response };
}

class FakeElement implements ConfirmationElementPort {
  readonly attributes = new Map<string, string>();
  readonly operations: string[] = [];
  private storedHidden = false;
  private storedTextContent: string | null = null;

  get textContent() {
    return this.storedTextContent;
  }

  set textContent(value: string | null) {
    this.operations.push("textContent");
    this.storedTextContent = value;
  }

  get hidden() {
    return this.storedHidden;
  }

  set hidden(value: boolean) {
    this.operations.push("hidden");
    this.storedHidden = value;
  }

  setAttribute(name: string, value: string) {
    this.operations.push(`setAttribute:${name}`);
    this.attributes.set(name, value);
  }

  removeAttribute(name: string) {
    this.operations.push(`removeAttribute:${name}`);
    this.attributes.delete(name);
  }

  get innerHTML(): never {
    throw new Error("innerHTML is forbidden");
  }

  set innerHTML(_value: string) {
    throw new Error("innerHTML is forbidden");
  }

  get outerHTML(): never {
    throw new Error("outerHTML is forbidden");
  }

  set outerHTML(_value: string) {
    throw new Error("outerHTML is forbidden");
  }

  insertAdjacentHTML(): never {
    throw new Error("insertAdjacentHTML is forbidden");
  }
}

class FakeButton extends FakeElement {
  private storedDisabled = true;

  get disabled() {
    return this.storedDisabled;
  }

  set disabled(value: boolean) {
    this.operations.push("disabled");
    this.storedDisabled = value;
  }
}

function createRendererHarness() {
  const status = new FakeElement();
  const button = new FakeButton();
  const recovery = new FakeElement();
  const elements: ConfirmationRenderElements = { button, recovery, status };
  return {
    button,
    elements,
    recovery,
    render: createNewsletterConfirmationRenderer(elements),
    status,
  };
}

describe("B6 network containment", () => {
  it("blocks an accidental global fetch before any functional test", async () => {
    networkSentinelTest = true;
    await expect(fetch("https://b6.invalid/sentinel")).rejects.toThrow(
      NETWORK_BLOCK_MESSAGE,
    );
    expect(globalFetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("newsletter confirmation controller", () => {
  it("captures a valid fragment, removes it before ready, and makes no POST", () => {
    const harness = createControllerHarness();

    harness.controller.initialize();

    expect(harness.dependencies.readFragment).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.currentPath).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.replaceUrl).toHaveBeenCalledWith(CONFIRMATION_PATH);
    expect(harness.dependencies.replaceUrl).toHaveBeenCalledTimes(1);
    expect(harness.effects).toEqual(["replace", "render:ready"]);
    expect(harness.renders).toEqual([{ state: "ready" }]);
    expect(harness.postConfirmation).not.toHaveBeenCalled();
  });

  it.each([
    "",
    "#",
    "#token=",
    `#token=${"a".repeat(42)}`,
    `#token=${"a".repeat(44)}`,
    `#token=${"a".repeat(42)}=`,
    `#token=${"a".repeat(42)}%41`,
    `#Token=${VALID_TOKEN}`,
    `#other=${VALID_TOKEN}`,
    `#token=${VALID_TOKEN}&x=1`,
    `#token=${VALID_TOKEN}&token=${VALID_TOKEN}`,
    `#token=${VALID_TOKEN}?source=email`,
    `#token=${"a".repeat(42)}+`,
    `#token=${"a".repeat(42)}/`,
  ])("rejects the absent or malformed fragment %j", (fragment) => {
    const harness = createControllerHarness({ readFragment: vi.fn(() => fragment) });

    harness.controller.initialize();

    expect(harness.dependencies.currentPath).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.replaceUrl).toHaveBeenCalledWith(CONFIRMATION_PATH);
    expect(harness.renders).toEqual([{ state: "invalid" }]);
    expect(harness.postConfirmation).not.toHaveBeenCalled();
  });

  it("uses only the injected pathname and never reads a query", () => {
    const harness = createControllerHarness({
      currentPath: vi.fn(() => CONFIRMATION_PATH),
    });

    harness.controller.initialize();

    expect(harness.dependencies.replaceUrl).toHaveBeenCalledWith(CONFIRMATION_PATH);
    expect(harness.effects).toEqual(["replace", "render:ready"]);
  });

  it("makes repeated initialize calls idempotent", () => {
    const harness = createControllerHarness();

    harness.controller.initialize();
    harness.controller.initialize();
    harness.controller.initialize();

    expect(harness.dependencies.readFragment).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.currentPath).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.replaceUrl).toHaveBeenCalledTimes(1);
    expect(harness.renders).toEqual([{ state: "ready" }]);
  });

  it.each(["readFragment", "currentPath", "replaceUrl"] as const)(
    "fails closed when %s throws",
    async (dependencyName) => {
      const failingDependency = vi.fn(() => {
        throw new Error("synthetic dependency failure");
      });
      const harness = createControllerHarness({
        [dependencyName]: failingDependency,
      });

      expect(() => harness.controller.initialize()).not.toThrow();
      await harness.controller.confirm();

      expect(harness.renders.at(-1)).toEqual({ state: "error" });
      expect(harness.postConfirmation).not.toHaveBeenCalled();
    },
  );

  it("blocks confirm reentrancy from render(ready), then permits one explicit call", async () => {
    const renders: ConfirmationUiState[] = [];
    const postConfirmation = vi.fn(async () => ({ state: "confirmed" }));
    let controller!: ReturnType<typeof createNewsletterConfirmationController>;
    controller = createNewsletterConfirmationController({
      readFragment: () => `#token=${VALID_TOKEN}`,
      currentPath: () => CONFIRMATION_PATH,
      replaceUrl: vi.fn(),
      postConfirmation,
      render: (state) => {
        renders.push(state);
        if (state.state === "ready") void controller.confirm();
      },
    });

    controller.initialize();
    expect(postConfirmation).not.toHaveBeenCalled();

    await controller.confirm();
    expect(postConfirmation).toHaveBeenCalledTimes(1);
    expect(postConfirmation).toHaveBeenCalledWith(VALID_TOKEN);
    expect(renders).toEqual([
      { state: "ready" },
      { state: "submitting" },
      { state: "confirmed" },
    ]);
  });

  it("clears the token and becomes terminal if render(ready) throws", async () => {
    const postConfirmation = vi.fn(async () => ({ state: "confirmed" }));
    const controller = createNewsletterConfirmationController({
      readFragment: () => `#token=${VALID_TOKEN}`,
      currentPath: () => CONFIRMATION_PATH,
      replaceUrl: vi.fn(),
      postConfirmation,
      render: () => {
        throw new Error("synthetic renderer failure");
      },
    });

    expect(() => controller.initialize()).not.toThrow();
    await controller.confirm();

    expect(postConfirmation).not.toHaveBeenCalled();
  });

  it("renders submitting synchronously before invoking the POST", async () => {
    const order: string[] = [];
    let resolvePost!: (value: { state: string }) => void;
    const postPromise = new Promise<{ state: string }>((resolve) => {
      resolvePost = resolve;
    });
    const harness = createControllerHarness({
      postConfirmation: vi.fn(() => {
        order.push("post");
        return postPromise;
      }),
      render: vi.fn((state) => order.push(`render:${state.state}`)),
    });
    harness.controller.initialize();
    order.length = 0;

    const confirmation = harness.controller.confirm();

    expect(order).toEqual(["render:submitting", "post"]);
    resolvePost({ state: "confirmed" });
    await confirmation;
    expect(order).toEqual([
      "render:submitting",
      "post",
      "render:confirmed",
    ]);
  });

  it("clears the closure before renderer and POST reentrancy and sends once", async () => {
    let controller!: ReturnType<typeof createNewsletterConfirmationController>;
    const postConfirmation = vi.fn(async () => {
      await controller.confirm();
      return { state: "confirmed" };
    });
    const render = vi.fn((state: ConfirmationUiState) => {
      if (state.state === "submitting") void controller.confirm();
    });
    controller = createNewsletterConfirmationController({
      readFragment: () => `#token=${VALID_TOKEN}`,
      currentPath: () => CONFIRMATION_PATH,
      replaceUrl: vi.fn(),
      postConfirmation,
      render,
    });
    controller.initialize();

    await Promise.all([controller.confirm(), controller.confirm(), controller.confirm()]);

    expect(postConfirmation).toHaveBeenCalledTimes(1);
    expect(postConfirmation).toHaveBeenCalledWith(VALID_TOKEN);
  });

  it.each([
    "confirmed",
    "already-processed",
    "expired",
    "invalid",
  ] as const)("renders the known terminal response %s", async (state) => {
    const harness = createControllerHarness({
      postConfirmation: vi.fn(async () => ({ state })),
    });
    harness.controller.initialize();

    await harness.controller.confirm();

    expect(harness.dependencies.render).toHaveBeenLastCalledWith({ state });
  });

  it.each([
    { label: "unknown state", post: async () => ({ state: "pending" }) },
    {
      label: "rejected promise",
      post: async () => {
        throw new Error("synthetic request failure");
      },
    },
  ])("reduces $label to the local error state", async ({ post }) => {
    const harness = createControllerHarness({ postConfirmation: vi.fn(post) });
    harness.controller.initialize();

    await expect(harness.controller.confirm()).resolves.toBeUndefined();

    expect(harness.dependencies.render).toHaveBeenLastCalledWith({ state: "error" });
  });

  it("never places the token or internal identifiers in render state", async () => {
    const forbidden = [
      VALID_TOKEN,
      "email@example.invalid",
      "subscription-id",
      "request-id",
      "job-id",
      "provider-id",
      "digest",
    ];
    const renderedValues: unknown[] = [];
    const harness = createControllerHarness({
      render: vi.fn((state) => renderedValues.push(state)),
    });
    harness.controller.initialize();
    await harness.controller.confirm();

    const renderedStrings = recursivelyCollectStrings(renderedValues);
    for (const value of forbidden) expect(renderedStrings).not.toContain(value);
    expect(renderedValues).toEqual([
      { state: "ready" },
      { state: "submitting" },
      { state: "confirmed" },
    ]);
  });

  it("does not touch storage or document.cookie globals", async () => {
    const names = ["localStorage", "sessionStorage", "document"] as const;
    const originals = new Map(
      names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]),
    );
    const forbiddenGetter = () => {
      throw new Error("forbidden global access");
    };
    try {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        get: forbiddenGetter,
      });
      Object.defineProperty(globalThis, "sessionStorage", {
        configurable: true,
        get: forbiddenGetter,
      });
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: Object.defineProperty({}, "cookie", {
          configurable: true,
          get: forbiddenGetter,
          set: forbiddenGetter,
        }),
      });

      const harness = createControllerHarness();
      harness.controller.initialize();
      await harness.controller.confirm();
      expect(harness.postConfirmation).toHaveBeenCalledTimes(1);
    } finally {
      for (const name of names) {
        const original = originals.get(name);
        if (original) Object.defineProperty(globalThis, name, original);
        else Reflect.deleteProperty(globalThis, name);
      }
    }
  });
});

describe("confirmation response classifier", () => {
  it.each([
    [200, { ok: true, state: "confirmed" }, "confirmed"],
    [200, { ok: true, state: "already-processed" }, "already-processed"],
    [410, { ok: false, state: "expired" }, "expired"],
    [400, { ok: false, state: "invalid" }, "invalid"],
  ] as const)("accepts HTTP %i with state %s", (status, body, expected) => {
    expect(classifyConfirmationHttpResponse(status, body)).toEqual({
      state: expected,
    });
  });

  it.each([
    [200, { ok: false, state: "confirmed" }],
    [201, { ok: true, state: "confirmed" }],
    [410, { ok: true, state: "expired" }],
    [400, { ok: true, state: "invalid" }],
    [503, { ok: false, state: "error" }],
    [307, { ok: true, state: "confirmed" }],
    [200.5, { ok: true, state: "confirmed" }],
    [200, { state: "confirmed" }],
    [200, { ok: true }],
    [200, { ok: "true", state: "confirmed" }],
    [200, { ok: true, state: 1 }],
    [200, { ok: true, state: "pending" }],
    [200, []],
    [200, null],
    [200, "confirmed"],
    [200, 1],
    [200, new Date(0)],
  ] as const)("rejects mismatched or malformed pair %#", (status, body) => {
    expect(classifyConfirmationHttpResponse(status, body)).toEqual({ state: "error" });
  });

  it("ignores remote message and extra fields", () => {
    const result = classifyConfirmationHttpResponse(200, {
      ok: true,
      state: "confirmed",
      message: `<img src=x onerror=alert(1)> ${VALID_TOKEN}`,
      requestId: "remote-id",
    });

    expect(result).toEqual({ state: "confirmed" });
    expect(JSON.stringify(result)).not.toContain("message");
    expect(JSON.stringify(result)).not.toContain(VALID_TOKEN);
  });
});

describe("confirmation HTTP adapter", () => {
  it.each([
    "",
    "a".repeat(42),
    "a".repeat(44),
    `${"a".repeat(42)}=`,
    `${"a".repeat(42)}+`,
    `${"a".repeat(42)}/`,
    `%${"a".repeat(42)}`,
  ])("rejects malformed raw token %j without a request", async (token) => {
    const dependencies = createHttpDependencies(
      jsonResponse('{"ok":true,"state":"confirmed"}', { status: 200 }),
    );

    await expect(postNewsletterConfirmation(token, dependencies)).resolves.toEqual({
      state: "error",
    });

    expect(dependencies.request).not.toHaveBeenCalled();
    expect(dependencies.timeoutSignal).not.toHaveBeenCalled();
  });

  it("sends one exact relative POST with JSON, timeout, and redirect error", async () => {
    const dependencies = createHttpDependencies(
      jsonResponse('{"ok":true,"state":"confirmed"}', { status: 200 }),
    );

    const result = await postNewsletterConfirmation(VALID_TOKEN, dependencies);

    expect(result).toEqual({ state: "confirmed" });
    expect(dependencies.timeoutSignal).toHaveBeenCalledOnce();
    expect(dependencies.timeoutSignal).toHaveBeenCalledWith(12_000);
    expect(dependencies.request).toHaveBeenCalledOnce();
    expect(dependencies.request).toHaveBeenCalledWith(
      "/api/newsletter/confirm",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: VALID_TOKEN }),
        signal: dependencies.signal,
        redirect: "error",
      },
    );
  });

  it.each([307, 308])(
    "does not follow an external HTTP %i redirect or make a second request",
    async (status) => {
      const entries: Array<{ input: string; init: RequestInit }> = [];
      const dependencies = {
        request: vi.fn(async (input: string, init: RequestInit) => {
          entries.push({ input, init });
          return jsonResponse('{"ok":true,"state":"confirmed"}', {
            status,
            headers: {
              Location: "https://redirect-target.invalid/token-sink",
            },
          });
        }),
        timeoutSignal: vi.fn(() => new AbortController().signal),
      };

      await expect(
        postNewsletterConfirmation(VALID_TOKEN, dependencies),
      ).resolves.toEqual({ state: "error" });

      expect(entries).toHaveLength(1);
      expect(entries[0]?.input).toBe("/api/newsletter/confirm");
      expect(entries[0]?.init.redirect).toBe("error");
      expect(entries[0]?.input).not.toContain("redirect-target.invalid");
    },
  );

  it.each([307, 308])(
    "reduces a fetch-style rejected HTTP %i redirect to error without retry",
    async () => {
      const request = vi.fn(async (_input: string, _init: RequestInit) => {
        throw new TypeError("synthetic redirect blocked");
      });
      const result = await postNewsletterConfirmation(VALID_TOKEN, {
        request,
        timeoutSignal: () => new AbortController().signal,
      });

      expect(result).toEqual({ state: "error" });
      expect(request).toHaveBeenCalledTimes(1);
      expect(request.mock.calls[0]?.[0]).toBe("/api/newsletter/confirm");
    },
  );

  it.each([301, 302, 303])("never classifies HTTP %i as success", async (status) => {
    const dependencies = createHttpDependencies(
      jsonResponse('{"ok":true,"state":"confirmed"}', {
        status,
        headers: { Location: "https://redirect-target.invalid/" },
      }),
    );

    expect(await postNewsletterConfirmation(VALID_TOKEN, dependencies)).toEqual({
      state: "error",
    });
    expect(dependencies.request).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["empty JSON", "", { "Content-Type": "application/json" }],
    ["invalid JSON", "{", { "Content-Type": "application/json" }],
    ["non-JSON media type", '{"ok":true,"state":"confirmed"}', { "Content-Type": "text/plain" }],
  ])("rejects %s", async (_label, body, headers) => {
    const dependencies = createHttpDependencies(
      new Response(body, { status: 200, headers }),
    );
    expect(await postNewsletterConfirmation(VALID_TOKEN, dependencies)).toEqual({
      state: "error",
    });
  });

  it("accepts a case-insensitive JSON media type with parameters", async () => {
    const dependencies = createHttpDependencies(
      new Response('{"ok":true,"state":"confirmed"}', {
        status: 200,
        headers: { "Content-Type": "Application/JSON; Charset=UTF-8" },
      }),
    );
    expect(await postNewsletterConfirmation(VALID_TOKEN, dependencies)).toEqual({
      state: "confirmed",
    });
  });

  it("reads the response.body property at most once", async () => {
    const actualBody = jsonResponse(
      '{"ok":true,"state":"confirmed"}',
      { status: 200 },
    ).body;
    let bodyReads = 0;
    const response = {
      status: 200,
      headers: new Headers({ "Content-Type": "application/json" }),
      get body() {
        bodyReads += 1;
        if (bodyReads > 1) throw new Error("response.body read more than once");
        return actualBody;
      },
    } as Response;
    const dependencies = createHttpDependencies(response);

    expect(await postNewsletterConfirmation(VALID_TOKEN, dependencies)).toEqual({
      state: "confirmed",
    });
    expect(bodyReads).toBe(1);
  });

  it("rejects an absent body", async () => {
    const dependencies = createHttpDependencies(
      new Response(null, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(await postNewsletterConfirmation(VALID_TOKEN, dependencies)).toEqual({
      state: "error",
    });
  });

  it("rejects invalid UTF-8 with fatal decoding", async () => {
    const response = new Response(new Uint8Array([0xc3, 0x28]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    const dependencies = createHttpDependencies(response);
    expect(await postNewsletterConfirmation(VALID_TOKEN, dependencies)).toEqual({
      state: "error",
    });
  });

  it("rejects Content-Length 4097 before reading and cancels the body", async () => {
    const tracked = trackedResponse({
      chunks: [new TextEncoder().encode(makeConfirmedJsonOfSize(4097))],
      headers: { "Content-Length": "4097" },
    });
    const dependencies = createHttpDependencies(tracked.response);

    expect(await postNewsletterConfirmation(VALID_TOKEN, dependencies)).toEqual({
      state: "error",
    });
    expect(tracked.getReader).not.toHaveBeenCalled();
    expect(tracked.bodyCancel).toHaveBeenCalledTimes(1);
  });

  it("rejects a normal 4097-byte body, cancels once, and never rereads", async () => {
    const tracked = trackedResponse({
      chunks: [new TextEncoder().encode(makeConfirmedJsonOfSize(4097))],
    });
    const dependencies = createHttpDependencies(tracked.response);

    expect(await postNewsletterConfirmation(VALID_TOKEN, dependencies)).toEqual({
      state: "error",
    });
    expect(tracked.getReader).toHaveBeenCalledTimes(1);
    expect(tracked.read).toHaveBeenCalledTimes(1);
    expect(tracked.readerCancel).toHaveBeenCalledTimes(1);
  });

  it("rejects a chunked body crossing 4096 bytes and cancels at the boundary", async () => {
    const bytes = new TextEncoder().encode(makeConfirmedJsonOfSize(4097));
    const tracked = trackedResponse({
      chunks: [bytes.slice(0, 2_048), bytes.slice(2_048)],
    });
    const dependencies = createHttpDependencies(tracked.response);

    expect(await postNewsletterConfirmation(VALID_TOKEN, dependencies)).toEqual({
      state: "error",
    });
    expect(tracked.getReader).toHaveBeenCalledTimes(1);
    expect(tracked.read).toHaveBeenCalledTimes(2);
    expect(tracked.readerCancel).toHaveBeenCalledTimes(1);
  });

  it("accepts exactly 4096 bytes and classifies the parsed object", async () => {
    const body = makeConfirmedJsonOfSize(CONFIRMATION_RESPONSE_MAX_BYTES);
    const tracked = trackedResponse({ chunks: [new TextEncoder().encode(body)] });
    const dependencies = createHttpDependencies(tracked.response);

    expect(await postNewsletterConfirmation(VALID_TOKEN, dependencies)).toEqual({
      state: "confirmed",
    });
    expect(tracked.read).toHaveBeenCalledTimes(2);
    expect(tracked.readerCancel).not.toHaveBeenCalled();
  });

  it.each(["network", "timeout"])("reduces a %s rejection to error without retry", async () => {
    const request = vi.fn(async () => {
      throw new Error("synthetic transport failure");
    });
    const result = await postNewsletterConfirmation(VALID_TOKEN, {
      request,
      timeoutSignal: () => new AbortController().signal,
    });

    expect(result).toEqual({ state: "error" });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("never returns a remote message, token, or extra identifier", async () => {
    const remote = `<script>${VALID_TOKEN}</script>`;
    const dependencies = createHttpDependencies(
      jsonResponse(
        JSON.stringify({
          ok: true,
          state: "already-processed",
          message: remote,
          requestId: "remote-request-id",
        }),
        { status: 200 },
      ),
    );

    const result: ConfirmationPostResult = await postNewsletterConfirmation(
      VALID_TOKEN,
      dependencies,
    );
    expect(result).toEqual({ state: "already-processed" });
    expect(JSON.stringify(result)).not.toContain(remote);
    expect(JSON.stringify(result)).not.toContain(VALID_TOKEN);
    expect(JSON.stringify(result)).not.toContain("remote-request-id");
  });
});

describe("accessible confirmation renderer", () => {
  const states: Array<{
    state: ConfirmationUiState["state"];
    text: string;
    disabled: boolean;
    busy: string | undefined;
    recoveryHidden: boolean;
  }> = [
    {
      state: "ready",
      text: "Para concluir, selecione Confirmar inscrição. Abrir este link não confirma sua inscrição.",
      disabled: false,
      busy: undefined,
      recoveryHidden: true,
    },
    {
      state: "submitting",
      text: "Confirmando sua inscrição…",
      disabled: true,
      busy: "true",
      recoveryHidden: true,
    },
    {
      state: "confirmed",
      text: "Inscrição confirmada. A sincronização da lista pode levar alguns instantes.",
      disabled: true,
      busy: undefined,
      recoveryHidden: true,
    },
    {
      state: "already-processed",
      text: "Este link já foi processado.",
      disabled: true,
      busy: undefined,
      recoveryHidden: true,
    },
    {
      state: "expired",
      text: "Este link expirou. Solicite uma nova confirmação pelo formulário.",
      disabled: true,
      busy: undefined,
      recoveryHidden: false,
    },
    {
      state: "invalid",
      text: "Link de confirmação inválido. Solicite uma nova confirmação pelo formulário.",
      disabled: true,
      busy: undefined,
      recoveryHidden: false,
    },
    {
      state: "error",
      text: "Não foi possível processar a confirmação agora. Retorne ao formulário e tente novamente.",
      disabled: true,
      busy: undefined,
      recoveryHidden: false,
    },
  ];

  it.each(states)("renders $state byte-for-byte through structural ports", (entry) => {
    const harness = createRendererHarness();
    harness.status.setAttribute("aria-busy", "stale");

    harness.render({ state: entry.state } as ConfirmationUiState);

    expect(harness.status.textContent).toBe(entry.text);
    expect(harness.status.attributes.get("role")).toBe("status");
    expect(harness.status.attributes.get("aria-live")).toBe("polite");
    expect(harness.status.attributes.get("aria-atomic")).toBe("true");
    expect(harness.status.attributes.get("aria-busy")).toBe(entry.busy);
    expect(harness.button.disabled).toBe(entry.disabled);
    expect(harness.button.hidden).toBe(false);
    expect(harness.recovery.hidden).toBe(entry.recoveryHidden);

    const serialized = JSON.stringify({
      button: [...harness.button.attributes],
      recovery: [...harness.recovery.attributes],
      status: [...harness.status.attributes],
      text: harness.status.textContent,
    });
    expect(serialized).not.toContain(VALID_TOKEN);
    expect(serialized).not.toContain("<script>");
    expect(serialized).not.toContain("request-id");

    const allowedOperation = /^(?:textContent|hidden|disabled|setAttribute:[\w-]+|removeAttribute:[\w-]+)$/u;
    for (const operation of [
      ...harness.status.operations,
      ...harness.button.operations,
      ...harness.recovery.operations,
    ]) {
      expect(operation).toMatch(allowedOperation);
    }
  });

  it("removes stale aria-busy after leaving submitting", () => {
    const harness = createRendererHarness();
    harness.render({ state: "submitting" });
    expect(harness.status.attributes.get("aria-busy")).toBe("true");

    harness.render({ state: "confirmed" });
    expect(harness.status.attributes.has("aria-busy")).toBe(false);
  });
});
