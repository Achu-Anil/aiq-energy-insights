import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
  ValidationError,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import {
  validate,
  ValidationError as ClassValidatorError,
} from "class-validator";

/**
 * Custom validation pipe with detailed error messages
 * Validates DTOs using class-validator decorators
 * Provides clear, user-friendly error messages for each validation failure
 */
@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata): Promise<any> {
    // Skip validation if no metatype or if it's a native JavaScript type
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Transform plain object to class instance
    const object = plainToInstance(metatype, value);

    // Validate the transformed object
    const errors = await validate(object, {
      whitelist: true, // Strip properties without decorators
      forbidNonWhitelisted: true, // Throw error for non-whitelisted properties
      transform: true, // Auto-transform types
      skipMissingProperties: false, // Validate missing properties
    });

    if (errors.length > 0) {
      // Format errors into user-friendly messages
      const formattedErrors = this.formatErrors(errors);
      throw new BadRequestException({
        statusCode: 400,
        error: "Bad Request",
        message: formattedErrors,
        timestamp: new Date().toISOString(),
      });
    }

    return object;
  }

  /**
   * Check if the metatype should be validated
   * Skip native JavaScript types
   */
  private toValidate(metatype: any): boolean {
    const types: any[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  /**
   * Format validation errors into clear, actionable messages
   * Flattens nested errors and extracts constraint messages
   */
  private formatErrors(errors: ClassValidatorError[]): string[] {
    const messages: string[] = [];

    const extractMessages = (
      error: ClassValidatorError,
      parentPath = ""
    ): void => {
      const propertyPath = parentPath
        ? `${parentPath}.${error.property}`
        : error.property;

      // Add constraint messages
      if (error.constraints) {
        Object.values(error.constraints).forEach((message) => {
          messages.push(message);
        });
      }

      // Recursively handle nested errors
      if (error.children && error.children.length > 0) {
        error.children.forEach((child) => extractMessages(child, propertyPath));
      }
    };

    errors.forEach((error) => extractMessages(error));
    return messages;
  }
}
