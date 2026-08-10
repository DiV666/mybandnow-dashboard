import type { App } from "vue";
import { i18n } from "../../infrastructure/config/i18n.js";
import { useToastStore } from "../stores/useToastStore.js";

export function configureErrorHandler(app: App): void {
	app.config.errorHandler = (error, _instance, info) => {
		const message = error instanceof Error ? error.stack ?? error.message : String(error);
		console.error("[unhandled-error]", message, info);
		const toastStore = useToastStore();
		toastStore.error(i18n.global.t("common.errors.unexpected"));
	};
}
