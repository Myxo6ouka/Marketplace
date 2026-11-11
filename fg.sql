--
-- PostgreSQL database dump
--

\restrict Ng0hhVh9Jg4tp3tPJE51UCI127CjVOyc8lBx0L8xxlyABszw1OqvaUwTzwJgcUa

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

-- Started on 2026-11-11 17:18:00

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 230 (class 1259 OID 17499)
-- Name: cart_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cart_items (
    id integer NOT NULL,
    cart_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT cart_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.cart_items OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 17498)
-- Name: cart_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.cart_items ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.cart_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 228 (class 1259 OID 17480)
-- Name: carts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.carts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.carts OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 17479)
-- Name: carts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.carts ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.carts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 224 (class 1259 OID 17422)
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    parent_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 17421)
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.categories ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 240 (class 1259 OID 17641)
-- Name: favorites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.favorites (
    id integer NOT NULL,
    user_id integer NOT NULL,
    product_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.favorites OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 17640)
-- Name: favorites_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.favorites ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.favorites_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 236 (class 1259 OID 17582)
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    sub_order_id integer NOT NULL,
    product_id integer,
    product_title character varying(200) NOT NULL,
    quantity integer NOT NULL,
    price numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT order_items_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT order_items_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 17581)
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.order_items ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.order_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 232 (class 1259 OID 17528)
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    buyer_id integer NOT NULL,
    address text NOT NULL,
    payment_method character varying(20) DEFAULT 'cash_on_delivery'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 17527)
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.orders ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 226 (class 1259 OID 17442)
-- Name: products; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.products (
    id integer NOT NULL,
    shop_id integer NOT NULL,
    category_id integer NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    price numeric(12,2) NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    image_url character varying(500),
    status character varying(10) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT products_price_check CHECK ((price >= (0)::numeric)),
    CONSTRAINT products_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'hidden'::character varying])::text[]))),
    CONSTRAINT products_stock_check CHECK ((stock >= 0))
);


ALTER TABLE public.products OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 17441)
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.products ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.products_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 238 (class 1259 OID 17611)
-- Name: reviews; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reviews (
    id integer NOT NULL,
    product_id integer NOT NULL,
    user_id integer NOT NULL,
    rating smallint NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO postgres;

--
-- TOC entry 237 (class 1259 OID 17610)
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.reviews ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.reviews_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 222 (class 1259 OID 17398)
-- Name: shops; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shops (
    id integer NOT NULL,
    owner_id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_blocked boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.shops OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 17397)
-- Name: shops_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.shops ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.shops_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 234 (class 1259 OID 17551)
-- Name: sub_orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sub_orders (
    id integer NOT NULL,
    order_id integer NOT NULL,
    shop_id integer NOT NULL,
    status character varying(10) DEFAULT 'new'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sub_orders_status_check CHECK (((status)::text = ANY ((ARRAY['new'::character varying, 'confirmed'::character varying, 'shipped'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


ALTER TABLE public.sub_orders OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 17550)
-- Name: sub_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.sub_orders ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sub_orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 220 (class 1259 OID 17377)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    name character varying(100) NOT NULL,
    role character varying(10) DEFAULT 'buyer'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['buyer'::character varying, 'seller'::character varying, 'admin'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 17376)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE public.users ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- TOC entry 4968 (class 2606 OID 17515)
-- Name: cart_items cart_items_cart_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_product_id_key UNIQUE (cart_id, product_id);


--
-- TOC entry 4970 (class 2606 OID 17513)
-- Name: cart_items cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4964 (class 2606 OID 17490)
-- Name: carts carts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_pkey PRIMARY KEY (id);


--
-- TOC entry 4966 (class 2606 OID 17492)
-- Name: carts carts_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_key UNIQUE (user_id);


--
-- TOC entry 4953 (class 2606 OID 17434)
-- Name: categories categories_parent_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_name_key UNIQUE (parent_id, name);


--
-- TOC entry 4955 (class 2606 OID 17432)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- TOC entry 4992 (class 2606 OID 17652)
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- TOC entry 4994 (class 2606 OID 17654)
-- Name: favorites favorites_user_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_product_id_key UNIQUE (user_id, product_id);


--
-- TOC entry 4985 (class 2606 OID 17597)
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- TOC entry 4974 (class 2606 OID 17543)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 4962 (class 2606 OID 17464)
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- TOC entry 4988 (class 2606 OID 17626)
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- TOC entry 4990 (class 2606 OID 17628)
-- Name: reviews reviews_product_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_user_id_key UNIQUE (product_id, user_id);


--
-- TOC entry 4949 (class 2606 OID 17415)
-- Name: shops shops_owner_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_owner_id_key UNIQUE (owner_id);


--
-- TOC entry 4951 (class 2606 OID 17413)
-- Name: shops shops_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_pkey PRIMARY KEY (id);


--
-- TOC entry 4979 (class 2606 OID 17567)
-- Name: sub_orders sub_orders_order_id_shop_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_orders
    ADD CONSTRAINT sub_orders_order_id_shop_id_key UNIQUE (order_id, shop_id);


--
-- TOC entry 4981 (class 2606 OID 17565)
-- Name: sub_orders sub_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_orders
    ADD CONSTRAINT sub_orders_pkey PRIMARY KEY (id);


--
-- TOC entry 4945 (class 2606 OID 17396)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 4947 (class 2606 OID 17394)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4971 (class 1259 OID 17526)
-- Name: idx_cart_items_cart_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_cart_items_cart_id ON public.cart_items USING btree (cart_id);


--
-- TOC entry 4956 (class 1259 OID 17440)
-- Name: idx_categories_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id);


--
-- TOC entry 4995 (class 1259 OID 17665)
-- Name: idx_favorites_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_favorites_user_id ON public.favorites USING btree (user_id);


--
-- TOC entry 4982 (class 1259 OID 17609)
-- Name: idx_order_items_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);


--
-- TOC entry 4983 (class 1259 OID 17608)
-- Name: idx_order_items_sub_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_sub_order_id ON public.order_items USING btree (sub_order_id);


--
-- TOC entry 4972 (class 1259 OID 17549)
-- Name: idx_orders_buyer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_buyer_id ON public.orders USING btree (buyer_id);


--
-- TOC entry 4957 (class 1259 OID 17476)
-- Name: idx_products_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_category_id ON public.products USING btree (category_id);


--
-- TOC entry 4958 (class 1259 OID 17478)
-- Name: idx_products_price; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_price ON public.products USING btree (price);


--
-- TOC entry 4959 (class 1259 OID 17475)
-- Name: idx_products_shop_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_shop_id ON public.products USING btree (shop_id);


--
-- TOC entry 4960 (class 1259 OID 17477)
-- Name: idx_products_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_products_status ON public.products USING btree (status);


--
-- TOC entry 4986 (class 1259 OID 17639)
-- Name: idx_reviews_product_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reviews_product_id ON public.reviews USING btree (product_id);


--
-- TOC entry 4975 (class 1259 OID 17578)
-- Name: idx_sub_orders_order_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sub_orders_order_id ON public.sub_orders USING btree (order_id);


--
-- TOC entry 4976 (class 1259 OID 17579)
-- Name: idx_sub_orders_shop_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sub_orders_shop_id ON public.sub_orders USING btree (shop_id);


--
-- TOC entry 4977 (class 1259 OID 17580)
-- Name: idx_sub_orders_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sub_orders_status ON public.sub_orders USING btree (status);


--
-- TOC entry 5001 (class 2606 OID 17516)
-- Name: cart_items cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id) ON DELETE CASCADE;


--
-- TOC entry 5002 (class 2606 OID 17521)
-- Name: cart_items cart_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cart_items
    ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 5000 (class 2606 OID 17493)
-- Name: carts carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.carts
    ADD CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4997 (class 2606 OID 17435)
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- TOC entry 5010 (class 2606 OID 17660)
-- Name: favorites favorites_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 5011 (class 2606 OID 17655)
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5006 (class 2606 OID 17603)
-- Name: order_items order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- TOC entry 5007 (class 2606 OID 17598)
-- Name: order_items order_items_sub_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_sub_order_id_fkey FOREIGN KEY (sub_order_id) REFERENCES public.sub_orders(id) ON DELETE CASCADE;


--
-- TOC entry 5003 (class 2606 OID 17544)
-- Name: orders orders_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 4998 (class 2606 OID 17470)
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;


--
-- TOC entry 4999 (class 2606 OID 17465)
-- Name: products products_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE;


--
-- TOC entry 5008 (class 2606 OID 17629)
-- Name: reviews reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- TOC entry 5009 (class 2606 OID 17634)
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4996 (class 2606 OID 17416)
-- Name: shops shops_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shops
    ADD CONSTRAINT shops_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5004 (class 2606 OID 17568)
-- Name: sub_orders sub_orders_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_orders
    ADD CONSTRAINT sub_orders_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 5005 (class 2606 OID 17573)
-- Name: sub_orders sub_orders_shop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_orders
    ADD CONSTRAINT sub_orders_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE RESTRICT;


-- Completed on 2026-11-11 17:18:01

--
-- PostgreSQL database dump complete
--

\unrestrict Ng0hhVh9Jg4tp3tPJE51UCI127CjVOyc8lBx0L8xxlyABszw1OqvaUwTzwJgcUa

