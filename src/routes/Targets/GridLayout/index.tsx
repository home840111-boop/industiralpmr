import { SimpleGrid } from "@chakra-ui/react"
import { Machine } from ".."
import MyCard from "../../../Components/micro/Card"
import NotFound from "../../../Components/micro/NotFound"
import LoadingCard from "./LoadingCard"
import ProductionCard from "./ProductionCard"

const GridLayout = ({
  machines,
  notFound
}: {
  machines: Machine[],
  notFound: boolean
}) => {
  const isLoading = machines.length === 0;

  return <SimpleGrid
    spacing={5}
    minChildWidth={{
      base: '100%',
      sm: 300
    }}
    mt="10px">
    {
      notFound ?
        <MyCard>
          <NotFound />
        </MyCard>
        : isLoading ?
          [...Array(10)].map((_, i) => <LoadingCard key={i} />)
          : machines.map(machine => <ProductionCard key={machine.id} machine={machine} />)
    }
  </SimpleGrid>
}

export default GridLayout