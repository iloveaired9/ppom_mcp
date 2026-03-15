<?php

namespace App\Legacy;


/**
 * Getmicrotime
 *
 * 자동 생성됨 (PHP Code Migrator Plugin)
 * 변환 시간: 2026-03-15T05:02:02.691Z
 */
class Getmicrotime
{
    /**
     * getmicrotime
     *
     * 원본 함수: getmicrotime
     * @param
     * @return mixed
     */
    public static function getmicrotime()
    {

        $microtimestmp = explode(" ", microtime());
        return $microtimestmp[0] + $microtimestmp[1];

    }

}


/**
 * DivisionTotal
 *
 * 자동 생성됨 (PHP Code Migrator Plugin)
 * 변환 시간: 2026-03-15T05:02:02.694Z
 */
class DivisionTotal
{
    /**
     * total_division
     *
     * 원본 함수: total_division
     * @param
     * @return mixed
     */
    public static function total_division()
    {

        global $m_connect, $s_connect, $t_division, $id;

        $sql = "select max(division) from " . $t_division . "_" . $id;
        $temp = $s_connect->executeFetch($sql);
        return $temp[0];

    }

}


/**
 * DivisionPlus
 *
 * 자동 생성됨 (PHP Code Migrator Plugin)
 * 변환 시간: 2026-03-15T05:02:02.694Z
 */
class DivisionPlus
{
    /**
     * plus_division
     *
     * 원본 함수: plus_division
     * @param $division
     * @return mixed
     */
    public static function plus_division($division)
    {

        global $m_connect, $t_division, $id;

        $sql = "update " . $t_division . "_" . $id . " set
                    num = num + 1
                where division = :division";
        $m_connect->execute($sql, array(
            ":division" => $division
        )) or error("시스템 오류입니다. [" . __LINE__ . "]");

    }

}


/**
 * MinusDivision
 *
 * 자동 생성됨 (PHP Code Migrator Plugin)
 * 변환 시간: 2026-03-15T05:02:02.694Z
 */
class MinusDivision
{
    /**
     * minus_division
     *
     * 원본 함수: minus_division
     * @param $division
     * @return mixed
     */
    public static function minus_division($division)
    {

        global $m_connect, $t_division, $id;

        $sql = "update " . $t_division . "_" . $id . " set
                    num = num - 1
                where division = :division";
        $m_connect->execute($sql, array(
            ":division" => $division
        )) or error("시스템 오류입니다. [" . __LINE__ . "]");

    }

}


/**
 * AddDivision
 *
 * 자동 생성됨 (PHP Code Migrator Plugin)
 * 변환 시간: 2026-03-15T05:02:02.696Z
 */
class AddDivision
{
    /**
     * add_division
     *
     * 원본 함수: add_division
     * @param $board_name
     * @return mixed
     */
    public static function add_division($board_name = "")
    {

        global $m_connect, $s_connect, $t_division, $id, $t_board;
        if (!$m_connect) $m_connect = master_conn();
        if (!$s_connect) $s_connect = slave_conn();

        if (!$s_connect) $s_connect = $m_connect;

        if ($board_name) $board_id = $board_name;
        else $board_id = $id;

        $sql = "select num from " . $t_division . "_" . $board_id . " order by division desc limit 1";
        $temp = $s_connect->executeFetch($sql);

        // 최대 division의 num값이 5000이상이면 division +1 생성;
        if ($temp["num"] >= 5000) {
            $sql = "select max(division) as max from " . $t_division . "_" . $board_id;
            $temp = $s_connect->executeFetch($sql);

            $max_division = $temp["max"] + 1;

            $sql = "select max(division) as max from " . $t_division . "_" . $board_id . " where num > 0 and division != :division";
            $temp = $s_connect->executeFetch($sql, array(
                ":division" => $max_division
            ));

            if (!$temp["max"]) $second_division = 0;
            else $second_division = $temp["max"];

            $insert_division = $max_division;
            $sql = "insert into " . $t_division . "_" . $board_id . "
                (division,num)
                values (:division, 1)";
            $m_connect->execute($sql, array(
                ":division" => $insert_division
            )) or error("시스템 오류입니다. [" . __LINE__ . "]");
        } else {
            $sql = "select max(division) as max from " . $t_division . "_" . $board_id . " where num > 0";
            $temp = $s_connect->executeFetch($sql);
            $division_temp = $temp["max"];

            $sql = "select num from " . $t_division . "_" . $board_id . " where division = :division";
            $temp = $s_connect->executeFetch($sql, array(
                ":division" => $division_temp
            ));
            $insert_division = $division_temp;
        }

        return $insert_division;

    }

}

