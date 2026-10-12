import {
  UnprocessableEntityException,
  type ValidationError,
  ValidationPipe,
} from "@nestjs/common"

export function createApiValidationPipe() {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    exceptionFactory: (validationErrors: ValidationError[]) => {
      const errors: Record<string, string[]> = {}
      const collect = (items: ValidationError[], prefix = "") => {
        for (const item of items) {
          const key = prefix ? `${prefix}.${item.property}` : item.property
          const messages = Object.values(item.constraints ?? {})
          if (messages.length > 0) errors[key] = messages
          collect(item.children ?? [], key)
        }
      }
      collect(validationErrors)
      return new UnprocessableEntityException({
        message: "The given data was invalid.",
        errors,
      })
    },
  })
}
