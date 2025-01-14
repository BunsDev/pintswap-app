import { Card, DataTable } from '../components';
import { useOffersContext } from '../stores';

const columns = [
    {
        name: 'peer',
        label: 'Peer',
        options: {
            filter: false,
            sort: true,
            sortThirdClickReset: true,
        },
    },
    {
        name: 'hash',
        label: 'Hash',
        options: {
            filter: false,
        },
    },
    {
        name: 'ticker',
        label: 'Pair',
        options: {
            filter: true,
            sort: true,
            sortThirdClickReset: true,
        },
    },
    {
        name: 'type',
        label: 'Type',
        options: {
            filter: true,
            sort: true,
            sortThirdClickReset: true,
        },
    },
    {
        name: 'amount',
        label: 'Amount',
        options: {
            filter: false,
            sort: true,
            sortThirdClickReset: true,
        },
    },
    {
        name: 'price',
        label: 'Price',
        options: {
            filter: false,
            sort: true,
            sortThirdClickReset: true,
        },
    },
];

export const ExploreView = () => {
    const { limitOrdersArr } = useOffersContext();

    return (
        <div className="flex flex-col gap-6">
            <Card header={"Explore"}>
                <DataTable 
                    title="Open Orders"
                    columns={columns}
                    data={limitOrdersArr}
                    loading={limitOrdersArr.length === 0}
                    type="explore"
                />
            </Card>
        </div>
    );
};
