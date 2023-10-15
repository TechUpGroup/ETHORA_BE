import { registerDecorator, ValidationOptions, ValidationArguments } from "class-validator";
import { LeaderboardType } from "common/enums/leaderboard.enums";
import { getCurrentDayIndex, getCurrentWeekIndex } from "common/utils/date";

export function IsOffsetInRange(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: "isOffsetInRange",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        defaultMessage: ({ value, property, object }: any) => {
          const type = (object as any)["type"];
          const network = (object as any)["network"];
          const id = type === LeaderboardType.DAILY ? getCurrentDayIndex(network, 0) : getCurrentWeekIndex(network, 0);
          return `${property} with value ${value} not a number or not in range [1-${id}]`;
        },
        validate(value: any, args: ValidationArguments) {
          const type = (args.object as any)["type"];
          const network = (args.object as any)["network"];
          const id = type === LeaderboardType.DAILY ? getCurrentDayIndex(network, 0) : getCurrentWeekIndex(network, 0);
          return typeof value === "number" && value <= id && value >= 1;
        },
      },
    });
  };
}
