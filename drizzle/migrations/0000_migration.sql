create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  default_style text,
  default_budget numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  style text not null,
  room_types text[] not null default '{}',
  colors text[] not null default '{}',
  materials text[] not null default '{}',
  price numeric not null,
  width_cm int, depth_cm int, height_cm int,
  description text not null default '',
  image_key text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "products public read" on public.products for select to anon, authenticated using (true);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null default 'My room',
  room_type text not null,
  image_path text,
  analysis jsonb,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.rooms to authenticated;
grant all on public.rooms to service_role;
alter table public.rooms enable row level security;
create policy "own rooms" on public.rooms for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.room_preferences (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references public.rooms(id) on delete cascade,
  user_id uuid not null,
  style text not null,
  budget numeric,
  colors text[] not null default '{}',
  width_m numeric, length_m numeric, height_m numeric,
  requirements text,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.room_preferences to authenticated;
grant all on public.room_preferences to service_role;
alter table public.room_preferences enable row level security;
create policy "own prefs" on public.room_preferences for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null,
  product_id uuid not null references public.products(id) on delete cascade,
  score numeric not null,
  reasons text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (room_id, product_id)
);
grant select, insert, update, delete on public.recommendations to authenticated;
grant all on public.recommendations to service_role;
alter table public.recommendations enable row level security;
create policy "own recs" on public.recommendations for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  room_id uuid references public.rooms(id) on delete set null,
  name text not null,
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.designs to authenticated;
grant all on public.designs to service_role;
alter table public.designs enable row level security;
create policy "own designs" on public.designs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.design_items (
  id uuid primary key default gen_random_uuid(),
  design_id uuid not null references public.designs(id) on delete cascade,
  user_id uuid not null,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (design_id, product_id)
);
grant select, insert, update, delete on public.design_items to authenticated;
grant all on public.design_items to service_role;
alter table public.design_items enable row level security;
create policy "own design items" on public.design_items for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  product_id uuid not null references public.products(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade,
  rating smallint not null,
  comment text,
  created_at timestamptz not null default now(),
  unique (user_id, product_id, room_id)
);
grant select, insert, update, delete on public.feedback to authenticated;
grant all on public.feedback to service_role;
alter table public.feedback enable row level security;
create policy "own feedback" on public.feedback for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "room photos read own" on storage.objects for select to authenticated using (bucket_id='room-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "room photos insert own" on storage.objects for insert to authenticated with check (bucket_id='room-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "room photos delete own" on storage.objects for delete to authenticated using (bucket_id='room-photos' and (storage.foldername(name))[1] = auth.uid()::text);

insert into public.products (name, category, style, room_types, colors, materials, price, width_cm, depth_cm, height_cm, description, image_key, tags) values
('Haven Bouclé Sofa','Sofa','Modern','{Living Room}','{cream,white}','{boucle,oak}',1890,220,95,78,'Deep three-seater in soft cream bouclé with a solid oak plinth.','sofa-boucle','{seating,cozy}'),
('Nordlys Linen Sofa','Sofa','Scandinavian','{Living Room,Office}','{grey,beige}','{linen,beech}',1450,200,88,80,'Light grey washed linen sofa on tapered beech legs.','sofa-linen','{seating,light}'),
('Foundry Leather Sofa','Sofa','Industrial','{Living Room,Office}','{brown,black}','{leather,steel}',2350,210,92,76,'Cognac aniline leather sofa on a blackened steel frame.','sofa-leather','{seating,statement}'),
('Velvet Crescent Sofa','Sofa','Luxury','{Living Room}','{green,gold}','{velvet,brass}',3200,240,100,74,'Curved emerald velvet sofa with brushed brass feet.','sofa-velvet','{seating,statement}'),
('Arc Travertine Coffee Table','Table','Minimalist','{Living Room}','{beige,cream}','{travertine}',980,110,60,35,'Honed travertine table with a sculptural arched base.','table-travertine','{surface,stone}'),
('Fjord Oak Dining Table','Table','Scandinavian','{Kitchen,Dining Room}','{natural,beige}','{oak}',1650,200,95,75,'Solid white-oiled oak dining table seating six.','table-oak','{dining}'),
('Rivet Reclaimed Desk','Desk','Industrial','{Office,Bedroom}','{brown,black}','{reclaimed wood,steel}',890,140,70,76,'Reclaimed pine desk on a riveted black steel base.','desk-industrial','{work}'),
('Plane Walnut Desk','Desk','Minimalist','{Office}','{brown}','{walnut}',1240,150,65,74,'Slim walnut writing desk with a hidden cable drawer.','desk-walnut','{work}'),
('Cloud Upholstered Bed','Bed','Modern','{Bedroom}','{white,grey}','{linen}',1790,180,215,110,'Queen bed with a softly padded wraparound headboard.','bed-upholstered','{sleep}'),
('Rattan Haven Bed','Bed','Bohemian','{Bedroom}','{natural,beige}','{rattan,teak}',1390,170,210,120,'Hand-woven rattan headboard on a solid teak frame.','bed-rattan','{sleep,natural}'),
('Woven Accent Chair','Chair','Bohemian','{Living Room,Bedroom}','{natural,beige}','{rattan}',420,72,74,82,'Peacock-inspired rattan accent chair with a linen cushion.','chair-rattan','{seating}'),
('Shell Lounge Chair','Chair','Luxury','{Living Room,Bedroom}','{pink,gold}','{velvet,brass}',1150,80,78,76,'Scalloped blush velvet lounge chair.','chair-velvet','{seating,statement}'),
('Ergo Task Chair','Chair','Modern','{Office}','{black,grey}','{mesh,aluminium}',690,66,66,110,'Ergonomic mesh task chair with lumbar support.','chair-office','{work,seating}'),
('Paper Globe Pendant','Lighting','Minimalist','{Living Room,Bedroom,Dining Room}','{white}','{paper}',180,60,60,60,'Large handmade washi paper pendant lamp.','lamp-paper','{light}'),
('Edison Cage Floor Lamp','Lighting','Industrial','{Living Room,Office}','{black,gold}','{steel}',260,40,40,165,'Tripod floor lamp with a black cage and exposed bulb.','lamp-industrial','{light}'),
('Brass Orb Table Lamp','Lighting','Luxury','{Bedroom,Living Room}','{gold,white}','{brass,opal glass}',340,30,30,48,'Opal glass globe on a brushed brass stem.','lamp-brass','{light}'),
('Kilim Wool Rug','Rug','Bohemian','{Living Room,Bedroom}','{terracotta,red,beige}','{wool}',620,200,300,1,'Hand-knotted kilim rug in warm terracotta tones.','rug-kilim','{textile}'),
('Ash Flatweave Rug','Rug','Scandinavian','{Living Room,Bedroom,Office}','{grey,white}','{wool,cotton}',390,170,240,1,'Soft grey flatweave rug with a subtle grid.','rug-flatweave','{textile}'),
('Ladder Shelf','Storage','Scandinavian','{Living Room,Office,Bedroom}','{natural}','{ash}',310,70,35,190,'Leaning ash ladder shelf with five tiers.','shelf-ladder','{storage}'),
('Pipe Bookcase','Storage','Industrial','{Office,Living Room}','{black,brown}','{steel,mango wood}',740,120,35,180,'Open bookcase with black pipe frame and mango shelves.','shelf-industrial','{storage}'),
('Monolith Sideboard','Storage','Modern','{Living Room,Dining Room,Kitchen}','{black}','{oak}',1380,180,45,75,'Black-stained oak sideboard with fluted doors.','sideboard-fluted','{storage}'),
('Ceramic Vase Trio','Decor','Minimalist','{Living Room,Bedroom,Kitchen,Office}','{white,beige}','{ceramic}',95,15,15,35,'Three matte stoneware vases in sand and chalk.','decor-vases','{accent}'),
('Fiddle Leaf Fig','Plant','Bohemian','{Living Room,Office,Bedroom}','{green}','{terracotta}',120,50,50,150,'Tall fiddle leaf fig in a terracotta pot.','plant-fig','{greenery}'),
('Abstract Canvas Art','Decor','Modern','{Living Room,Bedroom,Office}','{beige,terracotta,black}','{canvas}',280,90,4,120,'Large abstract canvas in earth tones.','decor-art','{wall}'),
('Marble Bar Stool','Chair','Luxury','{Kitchen}','{white,gold}','{marble,brass,velvet}',460,40,40,75,'Brass counter stool with a marble footrest.','stool-brass','{seating}'),
('Round Arch Mirror','Decor','Modern','{Bedroom,Living Room}','{gold}','{brass,glass}',350,80,3,180,'Full-length arched floor mirror in thin brass.','decor-mirror','{wall,light}');