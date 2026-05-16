import ARPageClient from './ARPageClient';

interface Props {
  searchParams: Promise<{
    rid?:   string;
    iid?:   string;
    name?:  string;
    emoji?: string;
  }>;
}

export default async function ARPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <ARPageClient
      restaurantId={params.rid   ?? '2687382e-3b00-4f57-9014-f484df89e3fe'}
      itemId={params.iid         ?? '05014285-09e4-47af-82ad-07545df3fa93'}
      itemName={params.name      ?? 'Menu Item'}
      emoji={params.emoji        ?? '🍽️'}
    />
  );
}