import { getCars } from "./actions";
import { CarsClient } from "./cars-client";

export default async function CarsPage() {
  const cars = await getCars();
  return <CarsClient cars={cars} />;
}