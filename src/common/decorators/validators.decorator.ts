import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";

export function IsBiggerThan(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isBiggerThan",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: {
        message: `${property} must be bigger than ${propertyName}`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return typeof value === "number" && typeof relatedValue === "number" && value > relatedValue;
        },
      },
    });
  };
}

export function IsGTE(property: string, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isGTE",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: {
        message: `${property} must be bigger than ${propertyName}`,
        ...validationOptions,
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedPropertyName] = args.constraints;
          const relatedValue = (args.object as any)[relatedPropertyName];
          return typeof value === "number" && typeof relatedValue === "number" && value >= relatedValue;
        },
      },
    });
  };
}

export function IsTimestamp(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: "isGTE",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: {
        message: `Timestamp is not valid or in the future`,
        ...validationOptions,
      },
      validator: {
        validate(value: any) {
          return typeof value === "number" && value > 0 && Math.round(Date.now() / 1000) - value >= 0;
        },
      },
    });
  };
}
