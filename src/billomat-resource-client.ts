import * as request from 'superagent';
import { SuperAgentRequest } from 'superagent';
import { Billomat } from './billomat';
import { BillomatApiClientConfig } from './get-billomat-api-client';

export class BillomatResourceClient<T extends Billomat.Resource> {
    constructor(private _config: BillomatApiClientConfig, private _name: Billomat.ResourceName) {}

    public list(query?: Record<string, string>, rateLimitState?: Billomat.RateLimitState): Promise<T[]> {
        return new Promise((resolve, reject) => {
            this.createAuthedRequest('GET', `api/${this._name}`)
                .query(query || {})
                .then((response) => {
                    if (rateLimitState) {
                        rateLimitState.numberOfRemainingRequests = parseInt(response.headers["X-Rate-Limit-Remaining"], 10);
                        rateLimitState.resetDate = new Date(response.headers["X-Rate-Limit-Reset"] * 1000);
                    }
                    const singular = SINGULAR.get(this._name);
                    if (singular === undefined) {
                        reject('Unsupported resource (no singular defined)');
                        return;
                    }
                    if (!this.isListResponse(response.body)) {
                        reject(`Invalid list response: ${JSON.stringify(response.body)}`);
                        return;
                    }
                    const returnValue = response.body[this._name][singular] || [];
                    resolve(Array.isArray(returnValue) ? returnValue : [returnValue]); // because if exactly one result is found, this property will actually not be a JSON array
                })
                .catch(reject);
        });
    }

    public get(id: number, rateLimitState?: Billomat.RateLimitState): Promise<T> {
        return new Promise((resolve, reject) => {
            this.createAuthedRequest('GET', `api/${this._name}/${id}`)
                .then((response) => {
                    if (rateLimitState) {
                        rateLimitState.numberOfRemainingRequests = parseInt(response.headers["X-Rate-Limit-Remaining"], 10);
                        rateLimitState.resetDate = new Date(response.headers["X-Rate-Limit-Reset"] * 1000);
                    }
                    const singular = SINGULAR.get(this._name);
                    if (singular === undefined) {
                        reject('Unsupported resource (no singular defined)');
                        return;
                    }
                    if (!this.isGetResponse(response.body)) {
                        reject(`Invalid get response: ${JSON.stringify(response.body)}`);
                        return;
                    }
                    resolve(response.body[singular]);
                })
                .catch(reject);
        });
    }

    public create(resource: T, rateLimitState?: Billomat.RateLimitState): Promise<T> {
        return new Promise((resolve, reject) => {
            const singular = SINGULAR.get(this._name);
            if (singular === undefined) {
                reject('Unsupported resource (no singular defined)');
                return;
            }
            const payload = {
                [singular]: resource,
            };
            this.createAuthedRequest('POST', `api/${this._name}`)
                .send(payload)
                .then((response) => {
                    if (rateLimitState) {
                        rateLimitState.numberOfRemainingRequests = parseInt(response.headers["X-Rate-Limit-Remaining"], 10);
                        rateLimitState.resetDate = new Date(response.headers["X-Rate-Limit-Reset"] * 1000);
                    }
                    if (!this.isCreateResponse(response.body)) {
                        reject(`Invalid create response: ${JSON.stringify(response.body)}`);
                        return;
                    }
                    resolve(response.body[singular]);
                })
                .catch(reject);
        });
    }

    public edit(resource: T, rateLimitState?: Billomat.RateLimitState): Promise<T> {
        return new Promise((resolve, reject) => {
            const singular = SINGULAR.get(this._name);
            if (singular === undefined) {
                reject('Unsupported resource (no singular defined)');
                return;
            }
            const payload = {
                [singular]: resource,
            };
            this.createAuthedRequest('PUT', `api/${this._name}`)
                .send(payload)
                .then((response) => {
                    if (rateLimitState) {
                        rateLimitState.numberOfRemainingRequests = parseInt(response.headers["X-Rate-Limit-Remaining"], 10);
                        rateLimitState.resetDate = new Date(response.headers["X-Rate-Limit-Reset"] * 1000);
                    }
                    if (!this.isEditResponse(response.body)) {
                        reject(`Invalid edit response: ${JSON.stringify(response.body)}`);
                        return;
                    }
                    resolve(response.body[singular]);
                })
                .catch(reject);
        });
    }

    public raw<TResult extends unknown>(
        method: string,
        subUri?: string,
        options?: Billomat.RawOptions,
        rateLimitState?: Billomat.RateLimitState
    ): Promise<TResult> {
        return new Promise((resolve, reject) => {
            const singular = SINGULAR.get(this._name);
            if (singular === undefined) {
                reject('Unsupported resource (no singular defined)');
                return;
            }

            const uri = `api/${this._name}${subUri ? `/${subUri}` : ''}`;
            let req = this.createAuthedRequest(method, uri).query(options?.query ?? {});

            if (options?.payload) {
                req = req.send(options.payload);
            }

            req.then((response) => {
                if (rateLimitState) {
                    rateLimitState.numberOfRemainingRequests = parseInt(response.headers["X-Rate-Limit-Remaining"], 10);
                    rateLimitState.resetDate = new Date(response.headers["X-Rate-Limit-Reset"] * 1000);
                }
                if (!this.isRawResponse(response.body)) {
                    reject(`Invalid response: ${JSON.stringify(response.body)}`);
                    return;
                }
                resolve(response.body as TResult);
            }).catch(reject);
        });
    }

    private isListResponse(o: unknown): o is Record<string, Record<string, T>> {
        return typeof o === 'object' && o !== null && this._name in o;
    }

    private isGetResponse(o: unknown): o is Record<string, T> {
        return typeof o === 'object' && o !== null;
    }

    private isCreateResponse(o: unknown): o is Record<string, T> {
        return typeof o === 'object' && o !== null;
    }

    private isEditResponse(o: unknown): o is Record<string, T> {
        return typeof o === 'object' && o !== null;
    }

    private isRawResponse(o: unknown): o is Record<string, T> {
        return typeof o === 'object' && o !== null;
    }

    private createAuthedRequest(method: string, endpoint: string): SuperAgentRequest {
        return request(method, `${this._config.baseUrl}/${endpoint}`)
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .set('X-BillomatApiKey', this._config.apiKey)
            .set('X-AppId', this._config.appId || '')
            .set('X-AppSecret', this._config.appSecret || '');
    }
}

const SINGULAR = new Map<Billomat.ResourceName, string>([
    ['activity-feed', 'activity'],
    ['articles', 'article'],
    ['clients', 'client'],
    ['client-property-values', 'client-property-value'],
    ['confirmations', 'confirmation'],
    ['countries', 'country'],
    ['credit-notes', 'credit-note'],
    ['currencies', 'currency'],
    ['delivery-notes', 'delivery-note'],
    ['estimates', 'estimate'],
    ['incomings', 'incoming'],
    ['invoices', 'invoice'],
    ['letters', 'letter'],
    ['recurrings', 'recurring'],
    ['reminders', 'reminder'],
    ['search', 'result'],
    ['suppliers', 'supplier'],
    ['users', 'user'],
]);
