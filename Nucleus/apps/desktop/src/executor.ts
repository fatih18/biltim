import type { AgentConfig } from "./config";
import type { Logger } from "./logger";

export type CommandRequest = {
	id?: string;
	command: string;
	args?: string[];
	cwd?: string;
	timeoutMs?: number;
};

export type CommandResult = {
	command: string;
	args: string[];
	exitCode: number | null;
	stdout: string;
	stderr: string;
	timedOut: boolean;
	startedAt: string;
	finishedAt: string;
	durationMs: number;
};

export async function executeCommand(
	input: CommandRequest,
	config: AgentConfig,
	logger: Logger,
): Promise<CommandResult> {
	const args = input.args ?? [];
	const started = Date.now();
	const startedAt = new Date(started).toISOString();

	const timeoutMs = input.timeoutMs ?? config.commandTimeoutMs;
	const maxOutputBytes = config.commandMaxOutputBytes;

	const controller = new AbortController();
	let timeoutId: ReturnType<typeof setTimeout> | undefined;

	if (timeoutMs > 0) {
		timeoutId = setTimeout(() => {
			controller.abort();
		}, timeoutMs);
	}

	logger.info("Executing command", {
		command: input.command,
		args,
		cwd: input.cwd,
		timeoutMs,
	});

	let stdout = "";
	let stderr = "";
	let exitCode: number | null = null;
	let timedOut = false;

	try {
		const proc = Bun.spawn([input.command, ...args], {
			cwd: input.cwd,
			stdout: "pipe",
			stderr: "pipe",
			signal: controller.signal,
		});

		const stdoutText = await new Response(proc.stdout).text();
		const stderrText = await new Response(proc.stderr).text();

		stdout = truncateOutput(stdoutText, maxOutputBytes);
		stderr = truncateOutput(stderrText, maxOutputBytes);

		exitCode = await proc.exited;
	} catch (error) {
		timedOut = controller.signal.aborted;
		logger.error("Command execution failed", error);
	} finally {
		if (timeoutId) clearTimeout(timeoutId);
	}

	const finished = Date.now();
	const finishedAt = new Date(finished).toISOString();
	const durationMs = finished - started;

	return {
		command: input.command,
		args,
		exitCode,
		stdout,
		stderr,
		timedOut,
		startedAt,
		finishedAt,
		durationMs,
	};
}

function truncateOutput(text: string, maxBytes: number): string {
	if (maxBytes <= 0) return "";
	if (text.length <= maxBytes) return text;
	return text.slice(0, maxBytes);
}
