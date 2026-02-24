
// Base Errors

export class BaseThrowable extends Error {
    public name = 'BaseThrowable';

    constructor(message: string, stack?: string|null) {
        super(message);
        if (stack) this.stack = stack;
    }
}

export class BaseWarning extends BaseThrowable {
    public name = 'BaseWarning';
}

export class BaseError extends BaseThrowable {
    public name = 'BaseError';
}
