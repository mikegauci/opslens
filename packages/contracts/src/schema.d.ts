export interface paths {
    "/api/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["health"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/stream": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["streamProbe"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["summary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/trend": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["trend"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/contributions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["contributions"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/activity": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get: operations["activity"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: never;
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    health: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Real database connectivity probe; no analytics dataset yet */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        database: "connected";
                        /** @enum {number} */
                        result: 1;
                        /** @enum {string} */
                        runtime: "node";
                        /** @enum {boolean} */
                        synthetic: true;
                        exampleGgrMinor: number;
                    };
                };
            };
            /** @description Database unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        error: "Database unavailable";
                    };
                };
            };
        };
    };
    streamProbe: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Finite diagnostic SSE: ready, then complete. No AI provider. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "text/event-stream": string;
                };
            };
        };
    };
    summary: {
        parameters: {
            query: {
                from: string;
                to: string;
                brand?: "harbor" | "summit";
                provider?: "nova" | "orbit" | "pulse";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Analytics with effective scope and immutable dataset evidence */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        metadata: {
                            /** @enum {boolean} */
                            synthetic: true;
                            /** @enum {string} */
                            currency: "EUR";
                            /** @enum {string} */
                            reportingTimezone: "UTC";
                            dataset: {
                                schemaVersion: number;
                                generatorVersion: number;
                                seed: number;
                                sha256: string;
                                rowCount: number;
                                /** Format: date-time */
                                from: string;
                                /** Format: date-time */
                                to: string;
                                /** Format: date-time */
                                asOf: string;
                            };
                            scope: {
                                /** Format: date-time */
                                from: string;
                                /** Format: date-time */
                                to: string;
                                /** @enum {string} */
                                brand?: "harbor" | "summit";
                                /** @enum {string} */
                                provider?: "nova" | "orbit" | "pulse";
                                /** @enum {string} */
                                basis: "settlement" | "placement";
                                /** @enum {string|null} */
                                status: "settled" | "pending" | "void" | null;
                            };
                        };
                        current: {
                            stakes: number;
                            payouts: number;
                            ggr: number;
                            players: number;
                        };
                        previous: {
                            stakes: number;
                            payouts: number;
                            ggr: number;
                            players: number;
                        } | null;
                        comparison: {
                            /** Format: date-time */
                            from: string;
                            /** Format: date-time */
                            to: string;
                            /** @enum {string|null} */
                            unavailableReason: "outside_dataset_window" | null;
                        };
                        ggrChange: number | null;
                        ggrChangePercent: number | null;
                        /** @enum {string|null} */
                        percentageUnavailableReason: "outside_dataset_window" | "nonpositive_baseline" | null;
                    };
                };
            };
            /** @description Invalid or incompatible filters */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error: {
                            /** @enum {string} */
                            code: "INVALID_QUERY" | "DATASET_CHANGED" | "UNAVAILABLE" | "TIMEOUT" | "CANCELLED";
                            message: string;
                        };
                    };
                };
            };
            /** @description Request cancelled (response may not reach disconnected caller) */
            408: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error: {
                            /** @enum {string} */
                            code: "INVALID_QUERY" | "DATASET_CHANGED" | "UNAVAILABLE" | "TIMEOUT" | "CANCELLED";
                            message: string;
                        };
                    };
                };
            };
            /** @description Dataset changed; restart pagination */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error: {
                            /** @enum {string} */
                            code: "INVALID_QUERY" | "DATASET_CHANGED" | "UNAVAILABLE" | "TIMEOUT" | "CANCELLED";
                            message: string;
                        };
                    };
                };
            };
            /** @description Analytics unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error: {
                            /** @enum {string} */
                            code: "INVALID_QUERY" | "DATASET_CHANGED" | "UNAVAILABLE" | "TIMEOUT" | "CANCELLED";
                            message: string;
                        };
                    };
                };
            };
            /** @description Statement timeout */
            504: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error: {
                            /** @enum {string} */
                            code: "INVALID_QUERY" | "DATASET_CHANGED" | "UNAVAILABLE" | "TIMEOUT" | "CANCELLED";
                            message: string;
                        };
                    };
                };
            };
        };
    };
    trend: {
        parameters: {
            query: {
                from: string;
                to: string;
                brand?: "harbor" | "summit";
                provider?: "nova" | "orbit" | "pulse";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Analytics with effective scope and immutable dataset evidence */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        metadata: {
                            /** @enum {boolean} */
                            synthetic: true;
                            /** @enum {string} */
                            currency: "EUR";
                            /** @enum {string} */
                            reportingTimezone: "UTC";
                            dataset: {
                                schemaVersion: number;
                                generatorVersion: number;
                                seed: number;
                                sha256: string;
                                rowCount: number;
                                /** Format: date-time */
                                from: string;
                                /** Format: date-time */
                                to: string;
                                /** Format: date-time */
                                asOf: string;
                            };
                            scope: {
                                /** Format: date-time */
                                from: string;
                                /** Format: date-time */
                                to: string;
                                /** @enum {string} */
                                brand?: "harbor" | "summit";
                                /** @enum {string} */
                                provider?: "nova" | "orbit" | "pulse";
                                /** @enum {string} */
                                basis: "settlement" | "placement";
                                /** @enum {string|null} */
                                status: "settled" | "pending" | "void" | null;
                            };
                        };
                        days: {
                            /** Format: date-time */
                            from: string;
                            /** Format: date-time */
                            to: string;
                            stakes: number;
                            payouts: number;
                            ggr: number;
                            players: number;
                        }[];
                    };
                };
            };
            /** @description Invalid or incompatible filters */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error: {
                            /** @enum {string} */
                            code: "INVALID_QUERY" | "DATASET_CHANGED" | "UNAVAILABLE" | "TIMEOUT" | "CANCELLED";
                            message: string;
                        };
                    };
                };
            };
            /** @description Request cancelled (response may not reach disconnected caller) */
            408: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error: {
                            /** @enum {string} */
                            code: "INVALID_QUERY" | "DATASET_CHANGED" | "UNAVAILABLE" | "TIMEOUT" | "CANCELLED";
                            message: string;
                        };
                    };
                };
            };
            /** @description Dataset changed; restart pagination */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error: {
                            /** @enum {string} */
                            code: "INVALID_QUERY" | "DATASET_CHANGED" | "UNAVAILABLE" | "TIMEOUT" | "CANCELLED";
                            message: string;
                        };
                    };
                };
            };
            /** @description Analytics unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error: {
                            /** @enum {string} */
                            code: "INVALID_QUERY" | "DATASET_CHANGED" | "UNAVAILABLE" | "TIMEOUT" | "CANCELLED";
                            message: string;
                        };
                    };
                };
            };
            /** @description Statement timeout */
            504: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error: {
                            /** @enum {string} */
                            code: "INVALID_QUERY" | "DATASET_CHANGED" | "UNAVAILABLE" | "TIMEOUT" | "CANCELLED";
                            message: string;
                        };
                    };
                };
            };
        };
    };
    contributions: {
        parameters: {
            query: {
                from: string;
                to: string;
                brand?: "harbor" | "summit";
                provider?: "nova" | "orbit" | "pulse";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Analytics with effective scope and immutable dataset evidence */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        metadata: {
                            /** @enum {boolean} */
                            synthetic: true;
                            /** @enum {string} */
                            currency: "EUR";
                            /** @enum {string} */
                            reportingTimezone: "UTC";
                            dataset: {
                                schemaVersion: number;
                                generatorVersion: number;
                                seed: number;
                                sha256: string;
                                rowCount: number;
                                /** Format: date-time */
                                from: string;
                                /** Format: date-time */
                                to: string;
                                /** Format: date-time */
                                asOf: string;
                            };
                            scope: {
                                /** Format: date-time */
                                from: string;
                                /** Format: date-time */
                                to: string;
                                /** @enum {string} */
                                brand?: "harbor" | "summit";
                                /** @enum {string} */
                                provider?: "nova" | "orbit" | "pulse";
                                /** @enum {string} */
                                basis: "settlement" | "placement";
                                /** @enum {string|null} */
                                status: "settled" | "pending" | "void" | null;
                            };
                        };
                        comparison: {
                            /** Format: date-time */
                            from: string;
                            /** Format: date-time */
                            to: string;
                            /** @enum {string|null} */
                            unavailableReason: "outside_dataset_window" | null;
                        };
                        providers: {
                            /** @enum {string} */
                            provider: "nova" | "orbit" | "pulse";
                            currentGgr: number;
                            previousGgr: number | null;
                            change: number | null;
                        }[];
                    };
                };
            };
            /** @description Invalid or incompatible filters */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error: {
                            /** @enum {string} */
                            code: "INVALID_QUERY" | "DATASET_CHANGED" | "UNAVAILABLE" | "TIMEOUT" | "CANCELLED";
                            message: string;
                        };
                    };
                };
            };
            /** @description Request cancelled (response may not reach disconnected caller) */
            408: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error: {
                            /** @enum {string} */
                            code: "INVALID_QUERY" | "DATASET_CHANGED" | "UNAVAILABLE" | "TIMEOUT" | "CANCELLED";
                            message: string;
                        };
                    };
                };
            };
            /** @description Dataset changed; restart pagination */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error: {
                            /** @enum {string} */
                            code: "INVALID_QUERY" | "DATASET_CHANGED" | "UNAVAILABLE" | "TIMEOUT" | "CANCELLED";
                            message: string;
                        };
                    };
                };
            };
            /** @description Analytics unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error: {
                            /** @enum {string} */
                            code: "INVALID_QUERY" | "DATASET_CHANGED" | "UNAVAILABLE" | "TIMEOUT" | "CANCELLED";
                            message: string;
                        };
                    };
                };
            };
            /** @description Statement timeout */
            504: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error: {
                            /** @enum {string} */
                            code: "INVALID_QUERY" | "DATASET_CHANGED" | "UNAVAILABLE" | "TIMEOUT" | "CANCELLED";
                            message: string;
                        };
                    };
                };
            };
        };
    };
    activity: {
        parameters: {
            query: {
                from: string;
                to: string;
                brand?: "harbor" | "summit";
                provider?: "nova" | "orbit" | "pulse";
                basis?: "settlement" | "placement";
                status?: "settled" | "pending" | "void";
                sort?: "date" | "stake";
                direction?: "asc" | "desc";
                limit?: string;
                offset?: string;
                datasetHash?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Analytics with effective scope and immutable dataset evidence */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        metadata: {
                            /** @enum {boolean} */
                            synthetic: true;
                            /** @enum {string} */
                            currency: "EUR";
                            /** @enum {string} */
                            reportingTimezone: "UTC";
                            dataset: {
                                schemaVersion: number;
                                generatorVersion: number;
                                seed: number;
                                sha256: string;
                                rowCount: number;
                                /** Format: date-time */
                                from: string;
                                /** Format: date-time */
                                to: string;
                                /** Format: date-time */
                                asOf: string;
                            };
                            scope: {
                                /** Format: date-time */
                                from: string;
                                /** Format: date-time */
                                to: string;
                                /** @enum {string} */
                                brand?: "harbor" | "summit";
                                /** @enum {string} */
                                provider?: "nova" | "orbit" | "pulse";
                                /** @enum {string} */
                                basis: "settlement" | "placement";
                                /** @enum {string|null} */
                                status: "settled" | "pending" | "void" | null;
                            };
                        };
                        rows: {
                            id: string;
                            player_id: string;
                            /** @enum {string} */
                            brand_id: "harbor" | "summit";
                            /** @enum {string} */
                            provider_id: "nova" | "orbit" | "pulse";
                            /** @enum {string} */
                            game_category: "slots" | "table";
                            /** Format: date-time */
                            placed_at: string;
                            /** Format: date-time */
                            settled_at: string | null;
                            /** @enum {string} */
                            status: "settled" | "pending" | "void";
                            /** @enum {string} */
                            currency: "EUR";
                            stake_minor: number;
                            payout_minor: number | null;
                        }[];
                        page: {
                            limit: number;
                            offset: number;
                            nextOffset: number | null;
                            /** @enum {string} */
                            sort: "date" | "stake";
                            /** @enum {string} */
                            direction: "asc" | "desc";
                            datasetHash: string;
                        };
                    };
                };
            };
            /** @description Invalid or incompatible filters */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error: {
                            /** @enum {string} */
                            code: "INVALID_QUERY" | "DATASET_CHANGED" | "UNAVAILABLE" | "TIMEOUT" | "CANCELLED";
                            message: string;
                        };
                    };
                };
            };
            /** @description Request cancelled (response may not reach disconnected caller) */
            408: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error: {
                            /** @enum {string} */
                            code: "INVALID_QUERY" | "DATASET_CHANGED" | "UNAVAILABLE" | "TIMEOUT" | "CANCELLED";
                            message: string;
                        };
                    };
                };
            };
            /** @description Dataset changed; restart pagination */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error: {
                            /** @enum {string} */
                            code: "INVALID_QUERY" | "DATASET_CHANGED" | "UNAVAILABLE" | "TIMEOUT" | "CANCELLED";
                            message: string;
                        };
                    };
                };
            };
            /** @description Analytics unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error: {
                            /** @enum {string} */
                            code: "INVALID_QUERY" | "DATASET_CHANGED" | "UNAVAILABLE" | "TIMEOUT" | "CANCELLED";
                            message: string;
                        };
                    };
                };
            };
            /** @description Statement timeout */
            504: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        error: {
                            /** @enum {string} */
                            code: "INVALID_QUERY" | "DATASET_CHANGED" | "UNAVAILABLE" | "TIMEOUT" | "CANCELLED";
                            message: string;
                        };
                    };
                };
            };
        };
    };
}
