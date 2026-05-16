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
      itemId={params.iid         ?? 'ba30dab0-8323-4ed6-8d60-716fb8b6b4b0'}
      itemName={params.name      ?? 'Menu Item'}
      emoji={params.emoji        ?? '🍽️'}
    />
  );
}